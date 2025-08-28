const Category = require("../models/Category");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVarient");

const loadProductManagement = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = parseInt(req.query.page) || 1;
    const limit = 3;
    console.log(search)
    const filter = search
      ? {
          $or: [
            {
              name: { $regex: search, $options: "i" },
            },
            { description: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.countDocuments( filter );
    const totalPages = Math.ceil(count / limit);
    res.render("admin/productManagement", {
      title: "Products-Management",
      layout: "layouts/adminLayout",
      products,
      limit,
      totalPages,
      currentPage: page,
      search,
    });
  } catch (error) {
    console.log("product page is loading error", error);
    res.status(500).send("server error loading product management page");
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isBlocked: false });
    res.render("admin/addProduct", {
      title: "Products-Management",
      layout: "layouts/adminLayout",
      categories,
    });
  } catch (error) {
    console.log("add product page is loading error", error);
    res.status(500).send("server error loading add product management page");
  }
};

const addProduct = async (req, res) => {
  try {
    if (!req.body.size || req.body.size.length === 0) {
      return res.render("admin/addProduct", {
        error: "At least one variant is required",
        title: "Products-Management",
        layout: "layouts/adminLayout",
      });
    }

    const images = req.files ? req.files.map((f) => f.filename) : [];

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      category_id: req.body.category,
      brand: req.body.brand,
      //   offers_id: req.body.offer || null,
      return_within: req.body.returnWithin
        ? new Date(
            Date.now() + parseInt(req.body.returnWithin) * 24 * 60 * 60 * 1000
          )
        : undefined,
      base_price: parseFloat(req.body.price),
      discount_percentage: parseFloat(req.body.discount),
      images,
    });

    const savedProduct = await product.save();
    const variants = req.body.size.map((size, index) => ({
      product_id: savedProduct._id,
      size: parseInt(size),
      additional_price: parseFloat(req.body.additionalPrice[index]) || 0,
      stock: parseInt(req.body.stock[index]) || 0,
    }));

    await Promise.all([savedProduct, ProductVariant.insertMany(variants)]);

    return res.redirect("/admin/product");
  } catch (error) {
    console.log("error while adding product", error);
    res.status(500).send("server error while adding product");
  }
};

module.exports = {
  loadProductManagement,
  loadAddProduct,
  addProduct,
};
