const Product = require("../models/Product");
const Category = require("../models/Category");
const Cart = require("../models/Cart");
const Wishlist=require('../models/Wishlist')
const Order=require('../models/Order')



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


  let cartItems = [];
  if (userId) {
    const cart = await Cart.findOne({ userId });
    cartItems = cart ? cart.items : [];
  }
  let wishlistItems = [];
  if (userId) {
    const wishlist = await Wishlist.findOne({ userId });
    wishlistItems = wishlist ? wishlist.products.map((p) => p.productId.toString()) : [];
  }

  const updatedProducts = products
    .filter((p) => p.selectedVariant) 
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
       const inWishlist = wishlistItems.includes(product._id.toString());

      return {
        ...product,
        categoryName: product.category?.name || "Unknown",
        oldPrice,
        discount: discountPercentage,
        price: finalPrice,
        stock: variant?.stock || 0,
        selectedVariant: variant,
        existingInCart,
        inWishlist, 
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


const loadDashboard = async (req, res) => {
  try {
    const summaryResult = await Order.aggregate([
      { $match: { status: { $nin: ["Cancelled", "Returned"] } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSales: { $sum: "$finalAmount" },
          totalDiscount: { $sum: "$discountAmount" },
        },
      },
    ]);
    const summary = summaryResult[0] || {
      totalOrders: 0,
      totalSales: 0,
      totalDiscount: 0,
    };
    console.log("Summary:", summary);

    const paymentMethods = await Order.aggregate([
      { $match: { status: { $nin: ["Cancelled", "Returned"] } } },
      {
        $group: {
          _id: "$paymentMethod",
          totalSales: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    console.log("Payment Methods:", paymentMethods);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const salesTrends = await Order.aggregate([
      {
        $match: {
          status: { $nin: ["Cancelled", "Returned"] },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    console.log("Sales Trends:", salesTrends);

    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.status": { $ne: "Cancelled" } } },
      {
        $group: {
          _id: "$items.name",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);
    console.log("Top Products:", topProducts);

    const topCustomers = await Order.aggregate([
      { $match: { status: { $nin: ["Cancelled", "Returned"] } } },
      {
        $group: {
          _id: "$userId",
          totalSpent: { $sum: "$finalAmount" },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userName: "$user.name",
          email: "$user.email",
          totalSpent: 1,
          totalOrders: 1,
        },
      },
    ]);
    console.log("Top Customers:", topCustomers);

    const salesReport = await Order.aggregate([
      {
        $match: {
          status: { $nin: ["Cancelled", "Returned"] },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          ordersCount: { $sum: 1 },
          totalSales: { $sum: "$finalAmount" },
          totalDiscount: { $sum: "$discountAmount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.render("admin/dashboard", {
      title: "Sales Dashboard",
      layout: "layouts/adminLayout",
      error: null,
      summary,
      paymentMethods: paymentMethods || [],
      salesTrends: salesTrends || [],
      topProducts: topProducts || [],
      topCustomers: topCustomers || [],
      salesReport: salesReport || [],
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).render("admin/dashboard", {
      title: "Sales Dashboard",
      error: "Failed to load dashboard data",
      summary: { totalOrders: 0, totalSales: 0, totalDiscount: 0 },
      paymentMethods: [],
      salesTrends: [],
      topProducts: [],
      topCustomers: [],
    });
  }
};




module.exports = {
  loadHomepage,
  loadDashboard,
};
