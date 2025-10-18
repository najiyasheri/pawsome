const { default: mongoose } = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVarient");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");

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

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      categoryId: new mongoose.Types.ObjectId(req.body.category),
      brand: req.body.brand,
      returnWithin: req.body.returnWithin
        ? new Date(
            Date.now() + parseInt(req.body.returnWithin) * 24 * 60 * 60 * 1000
          )
        : undefined,
      basePrice: parseFloat(req.body.price) || 0,
      discountPercentage: parseFloat(req.body.discount) || 0,
      images,
    });
    console.log(req.body);
    const savedProduct = await product.save();
    const variants = req.body.size.map((size, index) => ({
      productId: savedProduct._id,
      size: size.trim() !== "" ? size.trim() : "Nil",
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
    res.json({ success: true, _id: product._id, isBlocked: product.isBlocked });
  } catch (error) {
    console.error("error for fetching product", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to toggle block status" });
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
    const {
      name,
      description,
      price,
      category,
      brand,
      discount,
      images,
      size,
      additionalPrice,
      stock,
      variantId,
    } = req.body;


    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    product.name = name;
    product.description = description;
    product.categoryId = new mongoose.Types.ObjectId(category);
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

    const sizes = Array.isArray(size) ? size : size ? [size] : [];
    const finalSizes = sizes.map((s) =>
      s && s.trim() !== "" ? s.trim() : "Nil"
    );

    const additionalPrices = Array.isArray(additionalPrice)
      ? additionalPrice
      : additionalPrice
      ? [additionalPrice]
      : [];

    const stocks = Array.isArray(stock) ? stock : stock ? [stock] : [];
    const variantIds = Array.isArray(variantId)
      ? variantId
      : variantId
      ? [variantId]
      : [];

    if (
      sizes.length !== additionalPrices.length ||
      sizes.length !== stocks.length
    ) {
      return res
        .status(400)
        .send("Invalid variant data: mismatched array lengths");
    }

    const existingVariants = await ProductVariant.find({ productId: id });
    const updatedVariantIds = variantIds.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    // Delete variants removed by user
    for (const existingVariant of existingVariants) {
      if (!updatedVariantIds.includes(existingVariant._id.toString())) {
        await ProductVariant.findByIdAndDelete(existingVariant._id);
      }
    }

    // Update or create variants
    for (let i = 0; i < sizes.length; i++) {
      if (stocks[i] < 0) {
        return res
          .status(400)
          .send("Invalid variant data: stock must be non-negative");
      }

      const variantData = {
        size: finalSizes[i],
        additionalPrice: parseFloat(additionalPrices[i]) || 0,
        stock: parseInt(stocks[i], 10) || 0,
        productId: id,
        status: true,
      };

      if (variantIds[i] && mongoose.Types.ObjectId.isValid(variantIds[i])) {
        await ProductVariant.findByIdAndUpdate(variantIds[i], variantData, {
          new: true,
        });
      } else {
        await ProductVariant.create(variantData);
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
    const limit = 8;
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
      if (sort === "name-az") sortOption = { name: 1 };
      if (sort === "name-za") sortOption = { name: -1 };
    }

    const userId = req.session?.user?._id;

    // Fetch cart items if user logged in
    let cartItems = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }, "items.variantId").lean();
      cartItems = cart?.items?.map((item) => item.variantId.toString()) || [];
    }

    const products = await Product.aggregate([
      { $match: filter },
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
          selectedVariant: { $arrayElemAt: ["$variants", 0] },
        },
      },
      // Calculate oldPrice and finalPrice directly in aggregation
      {
        $addFields: {
          oldPrice: {
            $add: [
              "$basePrice",
              { $ifNull: ["$selectedVariant.additionalPrice", 0] },
            ],
          },
          finalPrice: {
            $round: [
              {
                $multiply: [
                  {
                    $subtract: [
                      1,
                      {
                        $divide: [{ $ifNull: ["$discountPercentage", 0] }, 100],
                      },
                    ],
                  },
                  {
                    $add: [
                      "$basePrice",
                      { $ifNull: ["$selectedVariant.additionalPrice", 0] },
                    ],
                  },
                ],
              },
              0,
            ],
          },
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
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

      ...(sort === "price-low"
        ? [{ $sort: { finalPrice: 1 } }]
        : sort === "price-high"
        ? [{ $sort: { finalPrice: -1 } }]
        : [{ $sort: sortOption }]),

      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).exec();

    let wishlistItems = [];
    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      wishlistItems =
        wishlist?.products?.map((item) => item.variantId.toString()) || [];
    }
    
    const count = await Product.countDocuments(filter);
    const totalPages = Math.ceil(count / limit);
    const categories = await Category.find({ isBlocked: false }).lean();

    const updatedProducts = products.map((product) => {
      const variant = product.selectedVariant;
      const additionalPrice = parseFloat(variant?.additionalPrice || 0);
      const basePrice = parseFloat(product.basePrice || 0);
      const discountPercentage = parseFloat(product.discountPercentage || 0);
      const oldPrice = basePrice + additionalPrice;
    

      return {
        ...product,
        categoryName: product.category?.name || "Unknown",
        oldPrice,
        discount: discountPercentage,
        price: Math.round(oldPrice * (1 - discountPercentage / 100)),
        stock: variant?.stock || 0,
        selectedVariant: variant || null,
        isOutOfStock: !variant,
        isExistingInCart: !!(
          variant && cartItems.includes(variant._id.toString())
        ),
        isFavourite: !!(variant && wishlistItems.includes(variant._id.toString())),
        variants: undefined,
        category: undefined,
      };
    });


    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json({
        products: updatedProducts,
        totalPages,
        currentPage: page,
        search,
        sort,
        category,
        priceRange,
      });
    }

    return res.render("user/products", {
      title: "User-Product",
      layout: "layouts/userLayout",
      user: req.session.user,
      products: updatedProducts,
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

    let product = await Product.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(productId),
          isBlocked: false,
        },
      },
      {
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
      // ✅ keep only active variants (status true)
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
      // ✅ sort variants so that in-stock ones come first
      {
        $addFields: {
          variants: {
            $sortArray: {
              input: "$variants",
              sortBy: { stock: -1 }, // highest stock first
            },
          },
        },
      },
      // ✅ pick the first variant (highest stock or next available)
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
        $unwind: { path: "$category", preserveNullAndEmptyArrays: true },
      },
    ]).exec();

    if (!product || product.length === 0) {
      return res.status(404).send("Product not found");
    }

    product = product[0];

    const variant = product.selectedVariant;
    const basePrice = parseFloat(product.basePrice || 0);
    const additionalPrice = parseFloat(variant?.additionalPrice || 0);
    const discountPercentage = parseFloat(product.discountPercentage || 0);
    const oldPrice = basePrice + additionalPrice;
    const price = Math.round(oldPrice * (1 - discountPercentage / 100));

    const userId = req.session?.user?._id;
    let isExistingInCart = false;
    let variantsInCart = [];

    if (userId) {
      const cart = await Cart.findOne({ userId });
      if (cart) {
        variantsInCart = cart.items
          .filter(
            (item) => item.productId.toString() === product._id.toString()
          )
          .map((item) => item.variantId.toString());
      }
    }

    const productData = {
      ...product,
      categoryName: product.category?.name || "Unknown",
      oldPrice,
      price,
      discount: discountPercentage,
      stock: variant?.stock || 0,
      selectedVariant: variant,
      isExistingInCart,
      rating: 4.8,
      variantsInCart,
      reviews: [
        { user: "Alice", rating: 5, comment: "Excellent product!" },
        { user: "John", rating: 4, comment: "Good but delivery was late." },
      ],
      variants: product.variants.map((v) => ({
        _id: v._id,
        size: v.size,
        additionalPrice: parseFloat(v.additionalPrice || 0),
        stock: v.stock,
        finalPrice: Math.round(
          (basePrice + parseFloat(v.additionalPrice || 0)) *
            (1 - discountPercentage / 100)
        ),
      })),
      category: undefined,
    };
     
    const relatedProducts = await Product.aggregate([
      {
        $match: {
          categoryId: product.categoryId,
          _id: { $ne: new mongoose.Types.ObjectId(productId) },
          isBlocked: false,
        },
      },
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
          variants: {
            $sortArray: {
              input: "$variants",
              sortBy: { stock: -1 },
            },
          },
        },
      },
      {
        $addFields: {
          selectedVariant: { $arrayElemAt: ["$variants", 0] },
        },
      },
      { $limit: 4 },
    ]).exec();

    const updatedRelatedProducts = relatedProducts.map((p) => {
      const additionalPrice = parseFloat(
        p.selectedVariant?.additionalPrice || 0
      );
      const basePrice = parseFloat(p.basePrice || 0);
      const discountPercentage = parseFloat(p.discountPercentage || 0);
      const oldPrice = basePrice + additionalPrice;
     
      
      return {
        ...p,
        oldPrice,
        discount: discountPercentage,
        price: Math.round(oldPrice * (1 - discountPercentage / 100)),
        stock: p.selectedVariant?.stock || 0,
        selectedVariant: p.selectedVariant,
      };
    });
     let isInWishlist = false;
    let wishlistProductIds = [];

    if (userId) {
      const wishlist = await Wishlist.findOne({ userId }).lean();
      if (wishlist) {
        wishlistProductIds = wishlist.products.map((product) => product.productId.toString());
        isInWishlist = wishlistProductIds.includes(product._id.toString());
      }
    }

    // ✅ mark related products as wishlist or not
    const relatedWithWishlist = updatedRelatedProducts.map((p) => ({
      ...p,
      isInWishlist: wishlistProductIds.includes(p._id.toString()),
    }));
    
    res.render("user/productDetail", {
      title: "Product Details",
      layout: "layouts/userLayout",
      user: req.session.user,
      product: productData,
      relatedProducts: relatedWithWishlist,
      isInWishlist, 
    });
  } catch (error) {
    console.error("Error loading product details:", error);
    res.status(500).send("Error loading product details");
  }
};

const loadProductDetailAdmin = async (req, res) => {
  try {
    const productId = req.params.id;
    const [product] = await Product.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(productId),
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
        $lookup: {
          from: "variants",
          localField: "_id",
          foreignField: "productId",
          as: "variants",
        },
      },
    ]);
    if (!product) {
      return res.status(404).send("product not found");
    }

    return res.render("admin/productDetail", {
      title: "productDetail",
      layout: "layouts/adminLayout",
      product,
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
  loadProductDetailAdmin,
};
