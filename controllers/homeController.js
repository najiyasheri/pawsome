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
        $addFields: {
          variants: {
            $filter: {
              input: "$variants",
              as: "variant",
              cond: { $eq: ["$$variant.status", true] },
            },
          },
        },
      },
      {
        $addFields: {
          firstVariant: { $arrayElemAt: ["$variants", 0] },
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

    const count = await Category.aggregate([
      {
        $match: { isBlocked: false },
      },
      {
        $lookup: {
          from: "products",
          foreignField: "categoryId",
          localField: "_id",
          as: "products",
        },
      },
      {
        $addFields: {
          productCount: { $size: "$products" },
        },
      },
      {
        $project: { products: 0 },
      },
    ]);

    let cartProductIds = [];
    if (userId) {
      const cart = await Cart.findOne({ userId });
      cartProductIds = cart
        ? cart.items.map((item) => item.productId.toString())
        : [];
    }

    const updatedProducts = products.map((product) => {
      const additionalPrice = product.firstVariant?.additionalPrice || 0;
      const basePrice = parseFloat(product.basePrice || 0);
      const discountPercentage = parseFloat(product.discountPercentage || 0);
      const oldPrice = basePrice + additionalPrice;

      const existingInCart = userId
        ? cartProductIds.includes(product._id.toString())
        : undefined;

      return {
        ...product,
        categoryName: product.category?.name || "Unknown",
        oldPrice,
        discount: discountPercentage,
        price: Math.round(oldPrice * (1 - discountPercentage / 100)),
        stock: product.firstVariant?.stock || 0,
        existingInCart,
      };
    });



    return res.render("user/home", {
      title: "HomePage",
      layout: "layouts/userLayout",
      user: req.session.user,
      products: updatedProducts,
      categories: count,
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
