const { default: mongoose } = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Variant = require("../models/ProductVariant");
const Coupon = require("../models/Coupon");
const loadOrder = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 2;

    const matchStage = {};

    if (search) {
      matchStage.orderId = { $regex: search, $options: "i" };
    }

    const totalOrdersAgg = await Order.aggregate([
      { $match: matchStage },
      { $count: "total" },
    ]);

    const totalOrders = totalOrdersAgg[0]?.total || 0;
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "orderId",
          as: "items",
          pipeline: [
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product",
                pipeline: [{ $project: { name: 1, price: 1, images: 1 } }],
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                quantity: 1,
                price: 1,
                "product.name": 1,
                "product.price": 1,
                "product.images": 1,
              },
            },
          ],
        },
      },
    ]);

    res.render("admin/orderManagement", {
      title: "Order-Management",
      layout: "layouts/adminLayout",
      orders,
      search,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

const loadOrderDetail = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate(
      "userId",
      "name email phone"
    );

    if (!order) return res.status(404).send("Order not found");

    const itemsWithSubtotal = order.items.map((item) => ({
      ...item.toObject(),
      subtotal: item.price * item.quantity,
    }));

    const fullOrder = {
      ...order.toObject(),
      items: itemsWithSubtotal,
    };

    res.render("admin/orderDetail", {
      title: "Order Details",
      layout: "layouts/adminLayout",
      order: fullOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    if (item.status === "Cancelled") {
      return res.redirect(`/admin/order/${orderId}`);
    }
    const product = await Product.findById(item.productId);
    if (product) {
      if (item.variant?._id) {
        const variant = await Variant.findById(item.variant._id);
        if (variant) {
          variant.stock = (variant.stock || 0) + item.quantity;
        }
      } 
      await product.save();
    }

    item.status = "Cancelled";
    item.cancellationReason = reason || "No reason provided";

    const allCancelled = order.items.every(
      (i) => i._id === item._id || i.status === "Cancelled"
    );
    if (allCancelled) order.status = "Cancelled";

    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error("Error cancelling single item:", err);
    res.status(500).send("Error cancelling item");
  }
};

const cancelEntireOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    if (order.status === "Cancelled") {
      return res.redirect(`/admin/order/${orderId}`);
    }

    for (const item of order.items) {
      if (item.status !== "Cancelled") {
        const product = await Product.findById(item.productId);
        if (product) {
          if (item.variant?._id) {
            const variant = await Variant.findById(item.variant._id);
            if (variant) {
              variant.stock = (variant.stock || 0) + item.quantity;
            }
          } else {
            product.stock = (product.stock || 0) + item.quantity;
          }
          await product.save();
        }
        item.status = "Cancelled";
        item.cancellationReason = reason || "No reason provided";
      }
    }

    order.status = "Cancelled";
    order.cancellationReason = reason || "No reason provided";

    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error("Error cancelling entire order:", err);
    res.status(500).send("Error cancelling order");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    order.status = status;
    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating status");
  }
};

const loadUserOrders = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orders = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "items.productInfo",
        },
      },
      {
        $unwind: {
          path: "$items.productInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "items.name": "$items.productInfo.name",
          "items.image": { $arrayElemAt: ["$items.productInfo.images", 0] },
          "items.price": "$items.price",
          "items.subtotal": { $multiply: ["$items.price", "$items.quantity"] },
        },
      },
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$orderId" },
          userId: { $first: "$userId" },
          paymentMethod: { $first: "$paymentMethod" },
          totalAmount: { $first: "$totalAmount" },
          shippingType: { $first: "$shippingType" },
          address: { $first: "$address" },
          status: { $first: "$status" },
          cancellationReason: { $first: "$cancellationReason" },
          createdAt: { $first: "$createdAt" },
          items: { $push: "$items" },
        },
      },
      { $sort: { createdAt: -1 } },
    ]);

    res.render("user/myOrder", {
      title: "MyOrders",
      layout: "layouts/userLayout",
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const loadUserOrderDetail = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, userId }).populate(
      "userId",
      "name email phone"
    );

    if (!order) return res.status(404).send("Order not found");

    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.productId).select(
          "name price images variants"
        );
        const price = item.price ?? product?.price ?? 0;
        return {
          ...item.toObject(),
          name: product?.name || "N/A",
          price,
          image: product?.images?.[0] || "",
          subtotal: price * item.quantity,
        };
      })
    );

    const fullOrder = {
      ...order.toObject(),
      items: itemsWithDetails,
    };

    res.render("user/orderDetails", {
      title: "Order Details",
      layout: "layouts/userLayout",
      order: fullOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

const userCancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    if (item.status === "Cancelled") return res.redirect(`/order/${orderId}`);

    const product = await Product.findById(item.productId);
    if (product) {
      if (item.variant?._id) {
        const variant = await Variant.findById(item.variant._id);
        if (variant) variant.stock = (variant.stock || 0) + item.quantity;
      } else {
        product.stock = (product.stock || 0) + item.quantity;
      }
      await product.save();
    }

    item.status = "Cancelled";
    item.cancellationReason = reason || "No reason provided";
    const allCancelled = order.items.every((i) => i.status === "Cancelled");
    if (allCancelled) order.status = "Cancelled";


    if(order.paymentMethod !== 'COD') {
          let refundAmount = item.price * item.quantity;
          if (order.couponId) {
            const coupon = await Coupon.findById(order.couponId);
            if (coupon) {
              if (coupon.minPurchase > order.finalAmount - refundAmount) {
                refundAmount -= order.discountAmount;
                await Coupon.updateOne(
                  { _id: order.couponId },
                  { $pull: { usedBy: userId } }
                );
                order.couponId = null;
              }
            }
          }

          let wallet = await Wallet.findOne({ userId });
          if (!wallet) wallet = await Wallet.create({ userId, balance: 0 });
          wallet.balance += refundAmount;
          await wallet.save();

          await Transaction.create({
            userId,
            walletId: wallet._id,
            type: "refund",
            transactionType: "credit",
            amount: refundAmount,
            orderId: order._id,
            description: `Refund for cancelled order ${order.orderId}`,
            balanceAfter: wallet.balance,
            status: "completed",
          });

    }
    await order.save();
    res.redirect(`/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};
const userCancelEntireOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).send("Order not found");

    if (order.status === "Cancelled") return res.redirect(`/order/${orderId}`);

    for (const item of order.items) {
      if (item.status !== "Cancelled") {
        const product = await Product.findById(item.productId);
        if (product) {
          if (item.variant?._id) {
            const variant = await Variant.findById(item.variant._id);
            if (variant) variant.stock = (variant.stock || 0) + item.quantity;
          } else {
            product.stock = (product.stock || 0) + item.quantity;
          }
          await product.save();
        }
        item.status = "Cancelled";
        item.cancellationReason = reason || "No reason provided";
      }
    }

    order.status = "Cancelled";
    order.cancellationReason = reason || "No reason provided";

    const wallet = await Wallet.findOne({ userId });
    const refundAmount = order.finalAmount;
    wallet.balance += refundAmount;
    await wallet.save();

    await Transaction.create({
      userId,
      walletId: wallet._id,
      type: "refund",
      transactionType: "credit",
      amount: refundAmount,
      orderId: order._id,
      description: `Refund for cancelled order ${order.orderId}`,
      balanceAfter: wallet.balance,
      status: "completed",
    });

    const coupon = await Coupon.updateOne(
      { _id: order.couponId },
      { $pull: { usedBy: userId } }
    );

    await order.save();
    res.redirect(`/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

const returnSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order)
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });

    if (order.status !== "Delivered")
      return res.status(400).json({
        success: false,
        message: "Only delivered items can be returned",
      });

    // 1️⃣ Update item status
    item.status = "Returned";
    item.returnReason = reason || "No reason provided";

    // 2️⃣ Restock product or variant
    const product = await Product.findById(item.productId);
    if (product) {
      if (item.variant?._id) {
        const variant = await Variant.findById(item.variant._id);
        if (variant) {
          variant.stock = (variant.stock || 0) + item.quantity;
          await variant.save();
        }
      } else {
        product.stock = (product.stock || 0) + item.quantity;
        await product.save();
      }
    }

      let wallet = await Wallet.findOne({ userId });
      if (!wallet) wallet = await Wallet.create({ userId, balance: 0 });

      const refundAmount = item.price * item.quantity;
      if(order.couponId) {
        const coupon = await Coupon.findById(order.couponId);
        if (coupon.minPurchase > order.finalAmount - refundAmount && coupon) {
          refundAmount -= order.discountAmount;
          await Coupon.updateOne(
            { _id: order.couponId },
            { $pull: { usedBy: userId } }
          );
           order.couponId = null;
        }
      }
      wallet.balance += refundAmount;
      await wallet.save();

      await Transaction.create({
        userId,
        walletId: wallet._id,
        type: "refund",
        transactionType: "credit",
        amount: refundAmount,
        orderId: order._id,
        description: `Refund for returned item '${item.name}' from order ${order.orderId}`,
        balanceAfter: wallet.balance,
        status: "completed",
      });

    await order.save();

    return res.json({ success: true, message: "Item returned successfully" });
  } catch (err) {
    console.error("Error returning single item:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to return item" });
  }
};

module.exports = {
  loadOrder,
  loadOrderDetail,
  cancelSingleItem,
  cancelEntireOrder,
  updateOrderStatus,
  loadUserOrders,
  loadUserOrderDetail,
  userCancelEntireOrder,
  userCancelSingleItem,
  returnSingleItem,
};
