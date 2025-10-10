const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Variant = require('../models/ProductVarient')

const loadCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("You must be logged in to view the cart");
    }

    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId"); 

    if (!cart || cart.items.length === 0) {
      return res.render("user/cart", {
        title: "Cart",
        layout: "layouts/userLayout",
        user: req.session.user,
        cart: null,
        message: "Your cart is empty",
      });
    }

    const enrichedItems = cart.items
      .map((item) => {
        const product = item.productId;
        const variant = item.variantId;

        if (!product || !variant) return null; 

          const basePrice = parseFloat(product.basePrice || 0);
          const discountPercentage = parseFloat(product.discountPercentage || 0);
          const oldPrice = basePrice + variant.additionalPrice;
          const finalPrice=Math.round(oldPrice * (1 - discountPercentage / 100))

        return {
          productId: product._id,
          variantId: variant._id,
          name: product.name,
          image: product.images?.[0],
          size: variant.size,
          stock: variant.stock,
          price: finalPrice,
          quantity: item.quantity,
          subtotal: finalPrice * item.quantity,
        };
      })
      .filter(Boolean);

    // Total price calculation
    const total = enrichedItems.reduce((sum, item) => sum + item.subtotal, 0);
console.log("cart irems", enrichedItems);


    res.render("user/cart", {
      title: "Cart",
      layout: "layouts/userLayout",
      user: req.session.user,
      cart: { items: enrichedItems, total },
    });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send("Server error");
  }
};



const addToCart = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: "You must be logged in to add items to the cart",
      });
    }

    const { productId, variantId } = req.body;
    const userId = req.session.user._id;
    const quantity = 1;

    // Fetch product and variant from their own collections
    const product = await Product.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    const variant = await Variant.findOne({
      _id: variantId,
      productId: productId,
      status: true, 
    });

    if (!variant)
      return res
        .status(404)
        .json({ success: false, message: "Variant not found" });

    // Check stock availability
    if (variant.stock < quantity) {
      return res.status(400).json({ success: false, message: "Out of stock" });
    }

    // Fetch or create user cart
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }
    
    if (quantity > variant.stock) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

      cart.items.push({
        productId,
        variantId,
        quantity,
      });
    
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Product successfully added to cart",
      stock: variant.stock,
    });
  } catch (err) {
    console.error("Error in addToCart:", err);
    res.status(500).json({ success: false, message: "Server error" });
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
