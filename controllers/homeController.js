const Product = require("../models/Product");
const Category = require("../models/Category");
const loadHomepage = async (req, res) => {
  try {
    const products = await Product.find({ isBlocked: false }).lean().limit(8);
    const categories = await Category.find({ isBlocked: false });
    const updatedProducts = products.map((p) => {
      return {
        ...p,
        oldPrice: p.basePrice,
        discount: p.discountPercentage,
        price: Math.round(p.basePrice * (1 - p.discountPercentage / 100)),
      };
    });
    return res.render("user/home", {
      title: "HomePage",
      layout: "layouts/userLayout",
      user: req.session.user,
      products: updatedProducts,
      categories,
    });
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
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
