const { default: mongoose } = require("mongoose");
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

    // let replacedImages = [];
    // if (req.files) {
    //   for (let i = 0; i < 4; i++) {
    //     if (req.files[`replaceImages[${i}]`]) {
    //       replacedImages[i] = req.files[`replaceImages[${i}]`][0].filename;
    //     }
    //   }
    // }

    // console.log(images)

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
      size: size.trim(),
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
    const { name, description, price, category, brand, discount, images } = req.body;

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

    // Parse existing images from body (hidden inputs for unreplaced slots)
    const existingImages = Array.isArray(images) ? images : images ? [images] : [];
    product.images = existingImages;

    // Handle uploaded files (replacements and new)
    if (req.files && req.files.length > 0) {
      const replaceImages = {};
      const newImages = [];

      // Log all files for debugging
      console.log('req.files overview:', req.files.map(f => ({ fieldname: f.fieldname, filename: f.filename })));

      req.files.forEach((file) => {
        const fieldName = file.fieldname;
        if (fieldName.startsWith('replaceImages[')) {
          const match = fieldName.match(/\[(\d+)\]/);
          if (match) {
            const index = parseInt(match[1], 10);
            if (!isNaN(index)) {
              replaceImages[index] = file.filename;
            }
          }
        } else if (fieldName === 'images[]') {
          newImages.push(file.filename);
        }
      });

      // Apply replacements to product.images
      for (const [indexStr, newImage] of Object.entries(replaceImages)) {
        const idx = parseInt(indexStr, 10);
        if (idx >= 0 && idx < product.images.length) {
          // Optional: Delete old image file
          const oldImage = product.images[idx];
          try {
            await fs.unlink(path.join('public/uploads', oldImage));
            console.log(`Deleted old image: ${oldImage}`);
          } catch (err) {
            console.error(`Failed to delete old image ${oldImage}:`, err);
          }
          product.images[idx] = newImage;
          console.log(`Replaced image at index ${idx}: ${newImage}`);
        }
      }

      console.log('After replacements, product.images:', product.images);
      console.log('newImages to add:', newImages);

      // Add new images only if under limit
      if (product.images.length + newImages.length <= 4) {
        product.images.push(...newImages);
      } else {
        // Delete excess new images
        for (const newImage of newImages) {
          try {
            await fs.unlink(path.join('public/uploads', newImage));
          } catch (err) {
            console.error(`Failed to delete excess image ${newImage}:`, err);
          }
        }
        return res.status(400).send("Cannot add more than 4 images");
      }
    } else {
      console.log('No files uploaded');
    }

    await product.save();
    console.log('Product saved with images:', product.images);
    res.redirect("/admin/product");
  } catch (err) {
    console.error('Error in postEditProduct:', err);
    if (err instanceof multer.MulterError) {
      return res.status(400).send(`Upload error: ${err.message}`);
    }
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

    const filter = {
      isBlocked: false,
    };

    if (search) {
      filter.$or = [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { description: { $regex: ".*" + search + ".*", $options: "i" } },
      ];
    }

    if (category) {
      try {
        filter.categoryId = new mongoose.Types.ObjectId(category);
      } catch (err) {
        console.error("Invalid category ID:", category);
        filter.categoryId = null;
      }
    }

    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-").map(Number);
      filter.basePrice = { $gte: minPrice, $lte: maxPrice };
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      if (sort === "price-low") sortOption = { basePrice: 1 };
      if (sort === "price-high") sortOption = { basePrice: -1 };
      if (sort === "name-az") sortOption = { name: 1 };
      if (sort === "name-za") sortOption = { name: -1 };
    }

    const products = await Product.find(filter)
      .collation({ locale: "en", strength: 1 })
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
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error showing products");
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(productId).lean();
    // if (!product) {
    //   return res.status(404).send("page not found");
    // }

    const relatedProducts = await Product.find({
      categoryId: product.categoryId,
      _id: { $ne: productId },
      isBlocked: false,
    })
      .limit(4)
      .lean();

    // Add dummy rating/reviews for now (or fetch from DB if you store them separately)
    product.rating = 4.8;
    product.reviews = [
      { user: "Alice", rating: 5, comment: "Excellent product!" },
      { user: "John", rating: 4, comment: "Good but delivery was late." },
    ];

    // Calculate discount price if you want
    product.oldPrice = product.basePrice;
    product.discount = product.discountPercentage;
    product.price = Math.round(
      product.basePrice * (1 - product.discountPercentage / 100)
    );

    res.render("user/productDetail", {
      title: "Product Details",
      layout: "layouts/userLayout",
      user: req.session.user,
      product,
      relatedProducts,
    });
  } catch (error) {
    console.error("Error loading product details:", error);
    res.status(500).send("Error loading product details");
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
  loadProductDetails,
};
