const Cart = require("../models/Cart");
const Product = require("../models/Product");

const loadCart = async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send("You must be logged in to view the cart");
  }
  const userId = req.session.user._id;
  const cart = await Cart.findOne({ userId }).populate("items.productId");

  console.log(cart)

  res.render("user/cart", {
    title: "Cart",
    layout: "layouts/userLayout",
    user: req.session.user,
    cart,
  });
};

const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .send("You must be logged in to add items to the cart");
    }
    const { productId } = req.body;
    let quantity = 1
    const userId = req.session.user._id;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).send("server error");
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
      });
    }
    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

const updateCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { productId, action } = req.body;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.redirect("/cart?error=Cart not found");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      return res.redirect("/cart?error=Item not found");
    }

    if (action === "increase") {
      cart.items[itemIndex].quantity += 1;
    } else if (action === "decrease") {
      cart.items[itemIndex].quantity -= 1;
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    }



    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/cart?error=Server error");
  }
};

const removeCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const { productId } = req.body;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.redirect("/cart?error=Cart not found");
    }

    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== productId
    );
    await cart.save();
    res.redirect("/cart");
  } catch (err) {
    console.error(err);
    res.redirect("/cart?error=Server error");
  }
};
module.exports = {
  loadCart,
  addToCart,
  updateCart,
  removeCart,
};
