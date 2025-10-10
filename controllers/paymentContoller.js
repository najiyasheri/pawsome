const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const OrderItem=require('../models/OrderItem')

const loadPayment = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId }).populate("items.productId");
    let subtotal = 0;
    if (cart && cart.items.length > 0) {
      cart.items.forEach((item) => {
        const price = Number(item.priceAtAdding) || 0;
        const qty = Number(item.quantity) || 0;

        subtotal += price * qty;
      });
    }
    const shipping = req.session.shipping || "regular";

    const deliveryCharge =
      shipping === "express"
        ? Number(process.env.EXPRESS_DELIVERY_CHARGE)
        : Number(process.env.REGULAR_DELIVERY_CHARGE);
    const total = subtotal + deliveryCharge;

    let address = await Address.findOne({ userId, isDefault: true });
    if (!address) {
      address = await Address.findOne({ userId });
    }

    res.render("user/payment", {
      title: "payment",
      layout: "layouts/userLayout",
      cart,
      subtotal,
      deliveryCharge,
      total,
      address,
      shipping,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};

const processPayment = async (req, res) => {
  try {
    const { paymentMethod, totalAmount } = req.body;

    const method = (paymentMethod || "").toLowerCase();

    if (method !== "cod") {
      return res.status(400).send("Only Cash on Delivery is allowed right now");
    }

    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    let subtotal = 0;
    if (cart && cart.items.length > 0) {
      cart.items.forEach((item) => {
        subtotal +=
          Number(item.priceAtAdding || 0) * Number(item.quantity || 0);
      });
    }
    const shippingType = req.session.shipping || "Regular";
    const deliveryCharge =
      req.session.shipping === "Express"
        ? Number(process.env.EXPRESS_DELIVERY_CHARGE)
        : Number(process.env.REGULAR_DELIVERY_CHARGE);


    const total = subtotal + deliveryCharge;
    const orderId = "ORD" + Date.now();
    const addressId = req.session.addressId;
    const address = await Address.findById(addressId);
    if (!address) {
      return res.render("user/address", { error: "address is not found" });
    }
    const newOrder = new Order({
      orderId,
      userId,
      shippingType,
      address: {
        name: address.name,
        phone: address.phone,
        address: address.address,
      },
      paymentMethod: paymentMethod.toUpperCase(),
      totalAmount: total,
      status: "Pending",
    });


    await newOrder.save();

    const orderItems = cart.items.map((item) => ({
      orderId: newOrder._id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.priceAtAdding,
    }));

    await OrderItem.insertMany(orderItems);

    cart.items = [];
    await cart.save();

    res.render("user/orderSuccess", { order: newOrder });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadPayment,
  processPayment,
};
