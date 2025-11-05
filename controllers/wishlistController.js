const Wishlist = require("../models/Wishlist");
const ProductVariant = require("../models/ProductVariant");
const Cart = require("../models/Cart");
const mongoose=require('mongoose')

const viewWishlist = async (req, res) => {
  const userId = req.session.user._id;
  console.log("User ID:", userId);

  const wishlist = await Wishlist.findOne({ userId })
    .populate({
      path: "products.productId",
      select: "name basePrice images discountPercentage",
    })
    .populate({
      path: "products.variantId",
      select: "stock additionalPrice size",
    })
    .lean();

  if (!wishlist) {
    console.log("Wishlist not found for user:", userId);
    return res.render("user/wishlist", {
      title: "My Wishlist",
      layout: "layouts/userLayout",
      products: [],
    });
  }

  const cart = await Cart.findOne({ userId }).lean();
  console.log("Cart:", JSON.stringify(cart, null, 2));

  const cartProducts = (cart?.items || []).map((item) => ({
    productId: String(item.productId),
    variantId: item.variantId ? String(item.variantId) : null,
  }));

  const updatedWishlist = (wishlist.products || []).map((item) => {
    const product = item.productId;
    const variant = item.variantId;
    const additionalPrice = parseFloat(variant?.additionalPrice || 0);
    const basePrice = parseFloat(product.basePrice || 0);
    const discountPercentage = parseFloat(product.discountPercentage || 0);
    const oldPrice = basePrice + additionalPrice;
    const productId = String(product?._id);
    const variantId = variant?._id ? String(variant._id) : null;

    const isInCart = cartProducts.some(
      (cp) =>
        cp.productId === productId &&
        (cp.variantId === variantId || (!cp.variantId && !variantId))
    );
    console.log(
      "Checking product:",
      product.name,
      "productId:",
      productId,
      "variantId:",
      variantId,
      "isInCart:",
      isInCart
    );

    return {
      ...product,
      variantId: variant?._id,
      oldPrice,
      discountPercentage,
      finalPrice: Math.round(oldPrice - (oldPrice * discountPercentage) / 100),
      isOutOfStock: variant?.stock === 0,
      isInCart,
    };
  });

  res.render("user/wishlist", {
    title: "My Wishlist",
    layout: "Layouts/userLayout",
    products: updatedWishlist,
  });
};
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;
    let variantId = req.params.variantId;

    console.log(userId);
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Please login to use wishlist" });
    }

    if (!variantId) {
      const variant = await ProductVariant.findOne({ productId });
      variantId = variant?._id || null;
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [{ productId, variantId }],
      });
    } else {
      const exists = wishlist.products.some(
        (item) =>
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId
      );

      if (!exists) {
        wishlist.products.push({ productId, variantId });
      }
    }

    await wishlist.save();
    res
      .status(200)
      .json({ success: true, message: "Product added to wishlist" });
  } catch (error) {
    console.error(error);
    res.status(402).send("server error");
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;
    await Wishlist.updateOne(
      { userId: req.session.user._id },
      { $pull: { products: { productId: productId } } }
    );
    res.json({ success: true, message: "Removed from wishlist" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};

const moveToCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { productId, variantId } = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "Login required" });
    }

    const pid = new mongoose.Types.ObjectId(productId);
    const vid = variantId ? new mongoose.Types.ObjectId(variantId) : null;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId: pid, variantId: vid, quantity: 1 }],
      });
    } else {
      if (!Array.isArray(cart.items)) cart.items = [];
console.log(cart)
      const existing = cart.items.find(
        (item) =>
          item.productId?.toString() === pid.toString() &&
          item.variantId?.toString() === vid?.toString()
      );

      if (existing) {
        existing.quantity += 1;
      } else {
        cart.items.push({ productId: pid, variantId: vid, quantity: 1 });
      }
    }

    await cart.save();

    const pullCondition = vid
      ? { productId: pid, variantId: vid }
      : { productId: pid };

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: pullCondition } }
    );

    res.json({ success: true, message: "Moved to cart successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Something went wrong" });
  }
};


module.exports = {
  viewWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
};
