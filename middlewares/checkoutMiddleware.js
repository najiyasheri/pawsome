const Cart = require("../models/Cart");

const requireCartNotEmpty = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.session.user._id });
    if (!cart || cart.items.length === 0) {
      return res.redirect("/cart");
    }
    next();
  } catch (err) {
    console.error("Error in requireCartNotEmpty:", err);
    res.redirect("/cart");
  }
};

module.exports = { requireCartNotEmpty };
