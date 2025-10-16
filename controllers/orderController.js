const { default: mongoose } = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

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

    console.log(orders);
   
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

    // Fetch order with embedded items and populated user info
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


// Cancel a single item in an order
const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    // Skip if already cancelled
    if (item.status === "Cancelled") {
      return res.redirect(`/admin/order/${orderId}`);
    }

    // Restore stock before cancelling
    const product = await Product.findById(item.productId);
    if (product) {
      if (item.variant?._id) {
        const variant = product.variants._id(item.variant._id);
        if (variant) {
          variant.stock = (variant.stock || 0) + item.quantity;
        }
      } else {
        product.stock = (product.stock || 0) + item.quantity;
      }
      await product.save();
    }

    // Mark as cancelled
    item.status = "Cancelled";
    item.cancellationReason = reason || "No reason provided";

    // If all items are cancelled, mark order as cancelled too
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



// Cancel entire order
const cancelEntireOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    // Skip if already cancelled
    if (order.status === "Cancelled") {
      return res.redirect(`/admin/order/${orderId}`);
    }

    // Restore stock for all items
    for (const item of order.items) {
      if (item.status !== "Cancelled") {
        const product = await Product.findById(item.productId);
        if (product) {
          if (item.variant?._id) {
            const variant = product.variants._id(item.variant._id);
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

    order.status=status
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
         "items.price": "$items.price", // keep original price if needed
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

    console.log(orders)

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

    // Find order only if it belongs to the logged-in user
    const order = await Order.findOne({ _id: orderId, userId }).populate(
      "userId",
      "name email phone"
    );

    if (!order) return res.status(404).send("Order not found");

    // Map product info and calculate subtotal
    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const product = await Product.findById(item.productId).select(
          "name price images variants"
        );
        return {
          ...item.toObject(),
          name: product?.name || "N/A",
          price: product?.price || 0,
          image: product?.images?.[0] || "",
          subtotal: (item.price || product?.price || 0) * item.quantity,
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



// Cancel a single item in user's order
const userCancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { reason } = req.body;
    const userId = req.session.user._id;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    if (item.status === "Cancelled")
      return res.redirect(`/order/${orderId}`);

    // Restore stock
    const product = await Product.findById(item.productId);
    if (product) {
      if (item.variant?._id) {
        const variant = product.variants._id(item.variant._id);
        if (variant) variant.stock = (variant.stock || 0) + item.quantity;
      } else {
        product.stock = (product.stock || 0) + item.quantity;
      }
      await product.save();
    }

    item.status = "Cancelled";
    item.cancellationReason = reason || "No reason provided";

    // If all items cancelled, mark order as cancelled
    const allCancelled = order.items.every((i) => i.status === "Cancelled");
    if (allCancelled) order.status = "Cancelled";

    await order.save();
    res.redirect(`/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


// Cancel entire order
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
            const variant = product.variants._id(item.variant._id);
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

    await order.save();
    res.redirect(`/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
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
  userCancelSingleItem
};
