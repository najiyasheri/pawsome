const Order = require("../models/order");
const Product = require("../models/Product");
const User = require("../models/User");

const loadOrder = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name")
      .populate("items.productId", "name price image")
      .sort({ createdAt: -1 });
    res.render("admin/orderManagement", {
      title: "Order-Management",
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
    const order = await Order.findById(orderId)
      .populate("userId", "name email phone")
      .populate("items.productId", "name price images");

    if (!order) return res.status(404).send("Order not found");
    res.render("admin/orderDetail", {
      title: "Order Details",
      layout: "layouts/adminLayout",
      order,
    });
  } catch (error) {
    console.error(err);
    res.status(500).send("Server error");
  }
};


const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");


    order.items = order.items.filter((item) => item._id.toString() !== itemId);

    if (order.items.length === 0) order.status = "Cancelled";

    await order.save();
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

    order.status = "Cancelled";
    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
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
    const orders = await Order.find({ userId })
      .populate("items.productId", "name price images")
      .sort({ createdAt: -1 });

    res.render("user/myOrder", {
      title: "MyOrders",
      layout:'layouts/userLayout',
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
  loadUserOrders
};
