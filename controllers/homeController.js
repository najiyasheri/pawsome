const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");



const loadHomepage = async (req, res) => {
  try {
  const userId = req.session?.user?._id;

  const products = await Product.aggregate([
    {
      $lookup: {
        from: "variants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },
    {
      // Only active variants with stock > 0
      $addFields: {
        variants: {
          $filter: {
            input: "$variants",
            as: "variant",
            cond: {
              $and: [
                { $eq: ["$$variant.status", true] },
                { $gt: ["$$variant.stock", 0] },
              ],
            },
          },
        },
      },
    },
    {
      // Pick first available variant (highest stock or first)
      $addFields: {
        selectedVariant: { $arrayElemAt: ["$variants", 0] },
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    {
      $unwind: {
        path: "$category",
        preserveNullAndEmptyArrays: true,
      },
    },
    { $limit: 8 },
  ]).exec();

  // Get categories with product counts
  const categories = await Category.aggregate([
    { $match: { isBlocked: false } },
    {
      $lookup: {
        from: "products",
        foreignField: "categoryId",
        localField: "_id",
        as: "products",
      },
    },
    { $project: { products: 0 } },
  ]);

  // Get products in cart for current user
  let cartItems = [];
  if (userId) {
    const cart = await Cart.findOne({ userId });
    cartItems = cart ? cart.items : [];
  }

  // Map products to include final price, stock, and existingInCart
  const updatedProducts = products
    .filter((p) => p.selectedVariant) // remove out-of-stock products
    .map((product) => {
      const variant = product.selectedVariant;
      const additionalPrice = variant?.additionalPrice || 0;
      const basePrice = parseFloat(product.basePrice || 0);
      const discountPercentage = parseFloat(product.discountPercentage || 0);
      const oldPrice = basePrice + additionalPrice;
      const finalPrice = Math.round(oldPrice * (1 - discountPercentage / 100));

      // Check if this product + variant combination exists in cart
      const existingInCart = cartItems.some(
        (item) =>
          item.productId.toString() === product._id.toString() &&
          item.variantId?.toString() === variant?._id?.toString()
      );

      return {
        ...product,
        categoryName: product.category?.name || "Unknown",
        oldPrice,
        discount: discountPercentage,
        price: finalPrice,
        stock: variant?.stock || 0,
        selectedVariant: variant,
        existingInCart, // ✅ true if in cart
        variants: undefined,
        category: undefined,
      };
    });

  return res.render("user/home", {
    title: "HomePage",
    layout: "layouts/userLayout",
    user: req.session.user,
    products: updatedProducts,
    categories
  });
  } catch (error) {
    console.error("Home page error:", error);
    res.status(500).send("Server error while loading Home page");
  }
};


const loadAdminDashboard = async (req, res) => {
  try {
    return res.render("admin/dashboard", {
      title: "Dashboard",
      layout: "layouts/adminLayout",
    });
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
  }
};

module.exports = {
  loadHomepage,
  loadAdminDashboard,
};
