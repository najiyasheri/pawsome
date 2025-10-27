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

const isInCheckout = async (req,res,next)=>{
  try {
    if(req.session.inCheckout){
      next()
    }else{
      res.redirect('/cart')
    }
  } catch (err) {
    console.error(err)
  }
}

module.exports = { requireCartNotEmpty, isInCheckout };
