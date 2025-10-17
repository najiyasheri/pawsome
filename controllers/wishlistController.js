const Wishlist = require("../models/Wishlist");
const ProductVariant=require('../models/ProductVarient')

const viewWishlist = async (req, res) => {
  const userId = req.session.user._id;
const wishlist = await Wishlist.findOne({ userId })
  .populate({
    path: "products.productId",
    select: "name basePrice images discountPercentage",
  }).populate({
    path: "products.variantId",  
    select: "stock additionalPrice size", 
  })

  .lean();

  const updatedWishlist = (wishlist?.products || []).map((item) => {
    const product = item.productId;  
    const variant = item.variantId;  
    const additionalPrice = parseFloat(variant?.additionalPrice || 0);
    const basePrice = parseFloat(product.basePrice || 0);
    const discountPercentage = parseFloat(product.discountPercentage || 0);
    const oldPrice = basePrice + additionalPrice;

    return {
      ...product,
      oldPrice,
      discountPercentage,
      finalPrice: Math.round(oldPrice - (oldPrice * discountPercentage) / 100),
      isOutOfStock: variant?.stock === 0,
    };
  });


  console.log(updatedWishlist);

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

    console.log(productId);
    console.log(variantId);

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
    console.error(error)
    res.status(402).send('server error')
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


module.exports = {
  viewWishlist,
  addToWishlist,
  removeFromWishlist,
};
