const Category = require("../models/Category");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVarient");
const fs = require("fs");
const path = require("path");

const loadProductManagement = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = parseInt(req.query.page) || 1;
    const limit = 5;
    console.log(search);
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

    const count = await Product.countDocuments(filter);
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
    let images = [];

    if (req.files && req.files["images[]"]) {
      images = req.files["images[]"].map((file) => file.filename);
    }

    let replacedImages = [];
    if (req.files) {
      for (let i = 0; i < 4; i++) {
        if (req.files[`replaceImages[${i}]`]) {
          replacedImages[i] = req.files[`replaceImages[${i}]`][0].filename;
        }
      }
    }

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      categoryId: req.body.category,
      brand: req.body.brand,
      // Offer is optional
      // offers_id: req.body.offer || null,
      returnWithin: req.body.returnWithin
        ? new Date(
            Date.now() + parseInt(req.body.returnWithin) * 24 * 60 * 60 * 1000
          )
        : undefined,
      basePrice: parseFloat(req.body.price) || 0,
      discountPercentage: parseFloat(req.body.discount) || 0,
      images,
    });

    const savedProduct = await product.save();
    const variants = req.body.size.map((size, index) => ({
      productId: savedProduct._id,
      size: size.trim(), // Keep as string if size isn't numeric
      additionalPrice: parseFloat(req.body.additionalPrice[index]) || 0,
      stock: parseInt(req.body.stock[index]) || 0,
    }));

    await ProductVariant.insertMany(variants);

    return res.redirect("/admin/product");
  } catch (error) {
    console.log("error while adding product", error);
    res.status(500).send("server error while adding product");
  }
};

const toggleBlock = async (req, res) => {
  try {
    let id = req.query.id;
    const product = await Product.findById(id);
    if (!product) {
      return res.render("admin/productManagement", {
        error: "there is no product",
      });
    }
    product.isBlocked = !product.isBlocked;
    await product.save();
    const search = req.query.search || "";
    const page = req.query.page || 1;

    return res.redirect(`/admin/product?page=${page}&search=${search}`);
  } catch (error) {
    console.error("error for fetching product", error);
  }
};

const loadEditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const variants = await ProductVariant.find({ productId: product._id });

    const categories = await Category.find({ isBlocked: false });

    console.log("product.categoryId:", product, product.categoryId);
    console.log(
      "categories:",
      categories.map((c) => c._id)
    );

    res.render("admin/editProduct", {
      title: "Edit Product",
      layout: "layouts/adminLayout",
      product,
      categories,
      variants,
    });
  } catch (error) {
    console.error("Error loading product for edit:", error);
    res.status(500).send("Error loading product for edit");
  }
};

const postEditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, brand, discount, images } =
      req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    product.name = name;
    product.description = description;
    product.categoryId = category;
    product.brand = brand;
    product.basePrice = parseFloat(price);
    product.discountPercentage = parseFloat(discount);

    const existingImages = Array.isArray(images)
      ? images
      : images
      ? [images]
      : [];
    product.images = existingImages;

    if (req.files) {
      const replaceImages = {};
      const newImages = [];

      Object.keys(req.files).forEach((fieldName) => {
        if (fieldName.startsWith("replaceImages[")) {
          const index = parseInt(fieldName.match(/\d+/)[0], 10);
          if (!isNaN(index) && req.files[fieldName][0]) {
            replaceImages[index] = req.files[fieldName][0].filename;
          }
        } else if (fieldName === "images[]" && req.files[fieldName]) {
          newImages.push(...req.files[fieldName].map((file) => file.filename));
        }
      });
      for (const [index, newImage] of Object.entries(replaceImages)) {
        const idx = parseInt(index, 10);
        if (idx >= 0 && idx < product.images.length) {
          const oldImage = product.images[idx];
          product.images[idx] = newImage;
        }
      }

      if (product.images.length + newImages.length <= 4) {
        product.images.push(...newImages);
      } else {
        for (const newImage of newImages) {
          try {
            await fs.unlink(path.join("public/uploads", newImage));
          } catch (err) {
            console.error(`Failed to delete excess image ${newImage}:`, err);
          }
        }
        return res.status(400).send("Cannot add more than 4 images");
      }
    }
    await product.save();
    res.redirect("/admin/product");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating product");
  }
};

const userProducts = async (req, res) => {
  try {
    let search = req.query.search || "";
    let page = parseInt(req.query.page) || 1;
    const limit = 5;
    let sort = req.query.sort || "";
    let category = req.query.category || "";
    let priceRange = req.query.priceRange || "";
    let brand = req.query.brand || "";

    // Build the filter object
    const filter = {
      isBlocked: false,
    };

    // Add search conditions
    if (search) {
      filter.$or = [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { description: { $regex: ".*" + search + ".*", $options: "i" } },
      ];
    }

    // Add category filter
    if (category) {
      filter.category = category;
    }

    // Add price range filter
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-").map(Number);
      filter.basePrice = { $gte: minPrice, $lte: maxPrice };
    }

    // Add brand filter
    if (brand) {
      filter.brand = brand;
    }

    // Build sort object
    let sortOption = { createdAt: -1 }; // Default sort
    if (sort) {
      if (sort === "price-low") sortOption = { basePrice: 1 };
      if (sort === "price-high") sortOption = { basePrice: -1 };
      if (sort === "name-az") sortOption = { name: 1 };
      if (sort === "name-za") sortOption = { name: -1 };
    }

    const products = await Product.find(filter)
      .sort(sortOption)
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.countDocuments(filter);
    const totalPages = Math.ceil(count / limit);
    const categories = await Category.find({ isBlocked: false });

    return res.render("user/products", {
      title: "User-Product",
      layout: "layouts/userLayout",
      user: req.session.user,
      products,
      categories,
      totalPages,
      limit,
      search,
      currentPage: page,
      sort,
      category,
      priceRange,
      brand,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error showing products");
  }
};

module.exports = {
  loadProductManagement,
  loadAddProduct,
  addProduct,
  toggleBlock,
  postEditProduct,
  loadEditProduct,
  userProducts,
};
