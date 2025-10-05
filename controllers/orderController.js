const Order = require("../models/order");
const Product = require("../models/Product");
const User = require("../models/User");

const loadOrder = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name")
      .populate("items.productId", "name price image");
    console.log(orders).sort({ createdAt: -1 });
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

module.exports = { loadOrder, loadOrderDetail };
