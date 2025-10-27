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
    const { filter = "daily", startDate, endDate } = req.query;

    const dateRange = calculateDateRange(filter, startDate, endDate);

  
    const dateMatchCondition = dateRange
      ? {
          status: { $nin: ["Cancelled", "Returned"] },
          createdAt: { $gte: dateRange.start, $lte: dateRange.end },
        }
      : { status: { $nin: ["Cancelled", "Returned"] } };

   
    const summaryResult = await Order.aggregate([
      { $match: dateMatchCondition },
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

    const paymentMethods = await Order.aggregate([
      { $match: dateMatchCondition },
      {
        $group: {
          _id: "$paymentMethod",
          totalSales: { $sum: "$finalAmount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalSales: -1 } },
    ]);

    const trendFormat = getTrendFormat(filter);
    const salesTrends = await Order.aggregate([
      { $match: dateMatchCondition },
      {
        $group: {
          _id: { $dateToString: { format: trendFormat, date: "$createdAt" } },
          totalSales: { $sum: "$finalAmount" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const topProducts = await Order.aggregate([
      { $match: dateMatchCondition },
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


    const topCustomers = await Order.aggregate([
      { $match: dateMatchCondition },
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

    const salesReport = await Order.aggregate([
      { $match: dateMatchCondition },
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
      filter,
      startDate: startDate || "",
      endDate: endDate || "",
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
      layout: "layouts/adminLayout",
      error: "Failed to load dashboard data",
      filter: req.query.filter || "daily",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      summary: { totalOrders: 0, totalSales: 0, totalDiscount: 0 },
      paymentMethods: [],
      salesTrends: [],
      topProducts: [],
      topCustomers: [],
      salesReport: [],
    });
  }
};

function calculateDateRange(filter, startDate, endDate) {
  const now = new Date();
  let start, end;

  switch (filter) {
    case "daily":

      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;

    case "weekly":
      end = new Date();
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;

    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "yearly":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "custom":
      if (startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      break;

    default:
      end = new Date();
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return { start, end };
}

function getTrendFormat(filter) {
  switch (filter) {
    case "daily":
      return "%Y-%m-%d %H:00"; 
    case "weekly":
    case "custom":
      return "%Y-%m-%d"; 
      return "%Y-%m-%d"; 
    case "yearly":
      return "%Y-%m"; 
    default:
      return "%Y-%m-%d";
  }
}


module.exports = {
  loadHomepage,
  loadDashboard,
};
