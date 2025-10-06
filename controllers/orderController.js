const { default: mongoose } = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const OrderItem = require("../models/OrderItem");

const loadOrder = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $sort: { createdAt: -1 },
      },
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

    console.log('orders' , orders)

    res.render("admin/orderManagement", {
      title: "Order Management",
      layout: "layouts/adminLayout",
      orders,
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
    const items = await OrderItem.find({ orderId: order._id }).populate(
      "productId",
      "name price images"
    );

    const fullOrder = {
      ...order.toObject(),
      items,
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

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const item = await OrderItem.findOne({ orderId, _id:itemId});
    
    item.status='Cancelled'
    await item.save();
    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling item");
  }
};

const cancelEntireOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

   await OrderItem.updateMany({orderId},{$set:{status:'Cancelled'}})

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling order");
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId,itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const item=await OrderItem.findById(itemId)

    item.status = status;
    await item.save();

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
              },
            },
           
          ],
        },
      },
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

module.exports = {
  loadOrder,
  loadOrderDetail,
  cancelSingleItem,
  cancelEntireOrder,
  updateOrderStatus,
  loadUserOrders,
};
