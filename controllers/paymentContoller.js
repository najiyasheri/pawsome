const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const OrderItem = require("../models/OrderItem");
const Product = require("../models/Product");

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

    res.render("user/payment", {
      title: "Payment",
      layout: "layouts/userLayout",
      cart: { items: enrichedItems, total: subtotal },
      subtotal,
      deliveryCharge,
      total,
      address,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
};

const processPayment = async (req, res) => {
  try {
    const { paymentMethod, addressId } = req.body;
    const method = (paymentMethod || "").toLowerCase();

    if (method !== "cod") {
      return res.status(400).send("Only Cash on Delivery is allowed right now");
    }

    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart?error=Cart is empty");
    }

    // Calculate totals and embed items
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
    const total = subtotal + deliveryCharge;

    const address = await Address.findById(addressId);
    if (!address) {
      return res.render("user/address", { error: "Address not found" });
    }

    const orderId = "ORD" + Date.now();

    // 🧾 Create new order
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
      totalAmount: total,
      status: "Pending",
    });

    await newOrder.save();

    // 🧩 Update stock for each item
    for (const item of embeddedItems) {
      const product = await Product.findById(item.productId);

      if (!product) continue;

      // If product has variants
      if (item.variant?.id) {
        const variant = product.variants.id(item.variant.id);
        if (variant) {
          variant.stock = Math.max(0, (variant.stock || 0) - item.quantity);
        }
      } else {
        // If no variants, reduce main product stock
        product.stock = Math.max(0, (product.stock || 0) - item.quantity);
      }

      await product.save();
    }

    // 🛒 Clear user's cart
    cart.items = [];
    await cart.save();

    // ✅ Render success page
    res.render("user/orderSuccess", { order: newOrder });
  } catch (err) {
    console.error("Error during payment process:", err);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadPayment,
  processPayment,
};
