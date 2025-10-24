const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Product = require("../models/Product");
const Variant = require("../models/ProductVariant");
const { razorpay } = require("../config/razorpay");
const crypto = require("crypto");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Coupon = require("../models/Coupon");

const loadPayment = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
      return res.render("user/payment", {
        title: "Payment",
        layout: "layouts/userLayout",
        cart: null,
        subtotal: 0,
        deliveryCharge: 0,
        total: 0,
        address: null,
        message: "Your cart is empty",
      });
    }

    let subtotal = 0;
    const enrichedItems = cart.items
      .map((item) => {
        const product = item.productId;
        const variant = item.variantId;

        if (!product || !variant) return null;

        const basePrice = parseFloat(product.basePrice || 0);
        const discountPercentage = parseFloat(product.discountPercentage || 0);
        const oldPrice = basePrice + (variant.additionalPrice || 0);
        const finalPrice = Math.round(
          oldPrice * (1 - discountPercentage / 100)
        );

        const subtotalPerItem = finalPrice * item.quantity;
        subtotal += subtotalPerItem;

        return {
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          image: product.images?.[0],
          size: variant.size,
          color: variant.color,
          quantity: item.quantity,
          price: finalPrice,
          oldPrice,
          discount: discountPercentage,
          subtotal: subtotalPerItem,
        };
      })
      .filter(Boolean);

    const deliveryCharge = 50;
    const total = subtotal + deliveryCharge;

    const currentDate = new Date();
    const availableCoupons = await Coupon.find({
      validFrom: { $lte: currentDate },
      validUntil: { $gte: currentDate },
      minPurchase: { $lte: subtotal },
      usedBy:{$nin:userId}
    }).sort({ createdAt: -1 });

    let address;
    if (req.query.addressId) {
      address = await Address.findOne({ _id: req.query.addressId, userId });
    }
    if (!address) {
      address = await Address.findOne({ userId, isDefault: true });
    }
    if (!address) {
      address = await Address.findOne({ userId });
    }
    const wallet = await Wallet.findOne({ userId });
    const walletBalance = wallet ? wallet.balance : 0;

    res.render("user/payment", {
      title: "Payment",
      layout: "layouts/userLayout",
      cart: { items: enrichedItems, total: subtotal },
      subtotal,
      deliveryCharge,
      total,
      address,
      walletBalance,
      coupons: availableCoupons,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};

const   processPayment = async (req, res) => {
  try {
    const { paymentMethod, addressId, couponCode } = req.body;
    const method = (paymentMethod || "").toLowerCase();
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart?error=Cart is empty");
    }

    let subtotal = 0;
    const embeddedItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = item.variantId;

      const basePrice = parseFloat(product.basePrice || 0);
      const discountPercentage = parseFloat(product.discountPercentage || 0);
      const oldPrice = basePrice + (variant?.additionalPrice || 0);
      const finalPrice = Math.round(oldPrice * (1 - discountPercentage / 100));

      subtotal += finalPrice * item.quantity;

      return {
        productId: product._id,
        name: product.name,
        image: product.images?.[0],
        variant: {
          id: variant?._id,
          size: variant?.size,
          color: variant?.color,
          additionalPrice: variant?.additionalPrice || 0,
        },
        quantity: item.quantity,
        price: finalPrice,
        oldPrice,
        discount: discountPercentage,
        subtotal: finalPrice * item.quantity,
      };
    });

    const deliveryCharge = 50;
    let offer = 0;
    let total = subtotal + deliveryCharge;
    let coupon;
    let isCouponApplied=false
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true,
      });

      const isUsed = coupon.usedBy.includes(userId);

      const now = new Date();
      if (
        coupon &&
        now >= coupon.validFrom &&
        now <= coupon.validUntil &&
        subtotal >= coupon.minPurchase &&
        !isUsed
      ) {
        offer = coupon.discountValue;
        total -= offer;
        await coupon.save();
        isCouponApplied=true;
      }
    }

    const address = await Address.findById(addressId);
    if (!address) {
      return res.render("user/address", { error: "Address not found" });
    }

    const orderId = "ORD" + Date.now();
    const newOrder = new Order({
      orderId,
      userId,
      address: {
        name: address.name,
        phone: address.phone,
        address: address.address,
      },
      paymentMethod: paymentMethod.toUpperCase(),
      items: embeddedItems,
      discountAmount: offer,
      totalAmount: total + offer,
      couponId:coupon?._id ?? null,
      finalAmount: total,
      status: "Pending",
    });

    if(isCouponApplied){
      coupon.usedBy.push(userId)
      await coupon.save() 
    }

    if (method === "cod") {
      await newOrder.save();
      for (const item of embeddedItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        if (item.variant?.id) {
          const variant = await Variant.findById(item.variant.id);
          if (variant) {
            variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
            await variant.save();
          }
        } else {
          product.stock = Math.max(0, (product.stock || 0) - item.quantity);
          await product.save();
        }
      }
      cart.items = [];
      await cart.save();
      return res.render("user/orderSuccess", { order: newOrder });
    }

    if (method === "wallet") {
      let wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        wallet = await Wallet.create({
          userId,
          balance: 0,
          transactions: [],
        });
      }

      if (wallet.balance < total) {
        return res.json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }

  
      wallet.balance -= total;
      await wallet.save();

      await Transaction.create({
        userId: userId,
        walletId: wallet._id,
        type: "order_payment",
        transactionType: "debit",
        amount: total,
        orderId: orderId,
        description: `Payment for order ${orderId}`,
        balanceAfter: wallet.balance,
        status: "completed",
      });

      newOrder.status = "Confirmed";
      await newOrder.save();

      for (const item of embeddedItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        if (item.variant?.id) {
          const variant = await Variant.findById(item.variant.id);
          if (variant) {
            variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
            await variant.save();
          }
        } else {
          product.stock = Math.max(0, (product.stock || 0) - item.quantity);
          await product.save();
        }
      }

      cart.items = [];
      await cart.save();

      return res.json({
        success: true,
        message: "Payment done using wallet",
        redirect: "/orders",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: orderId,
      payment_capture: 1,
    });

    await newOrder.save();

    res.json({
      success: true,
      razorpayOrder,
      orderId: newOrder._id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Error during payment process:", err);
    res.status(500).send("Server error");
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      const order = await Order.findById(orderId);
      order.status = "Confirmed";
      await order.save();
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        if (item.variant?.id) {
          const variant = await Variant.findById(item.variant.id);
          if (variant) {
            variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
            await variant.save();
          }
        } else {
          product.stock = Math.max(0, (product.stock || 0) - item.quantity);
          await product.save();
        }
      }

      await Cart.findOneAndUpdate({ userId: order.userId }, { items: [] });

      // res.json({ success: true, message: "Payment successful!" });
       res.render('user/orderSuccess')
    } else {
      res
        .status(400)
        .json({ success: false, message: "Payment verification failed!" });
    }
  } catch (error) {
    console.error("Error during payment process:", error);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadPayment,
  processPayment,
  verifyPayment,
};
