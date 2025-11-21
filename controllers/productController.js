const { default: mongoose } = require("mongoose");
const Category = require("../models/Category");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
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
    const limit = 4;
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
    const images = req.files["images[]"]
      ? req.files["images[]"].map((file) => ({
          url: file.path,
          public_id: file.filename,
        }))
      : [];

    if (images.length !== 4) {
      // Delete uploaded ones if less than 4
      for (const img of images) {
        await deleteFromCloudinary(img.public_id);
      }
      return res.status(400).send("Please upload exactly 4 images");
    }

    const product = new Product({
      name: req.body.name,
      description: req.body.description,
      categoryId: new mongoose.Types.ObjectId(req.body.category),
      brand: req.body.brand,
      returnWithin: req.body.returnWithin
        ? new Date(Date.now() + parseInt(req.body.returnWithin) * 86400000)
        : undefined,
      basePrice: parseFloat(req.body.price) || 0,
      discountPercentage: parseFloat(req.body.discount) || 0,
      images, // array of { url, public_id }
    });

    const savedProduct = await product.save();

    const variants = (req.body.size || []).map((size, i) => ({
      productId: savedProduct._id,
      size: size?.trim() || "Nil",
      additionalPrice: parseFloat(req.body.additionalPrice[i]) || 0,
      stock: parseInt(req.body.stock[i]) || 0,
    }));

    await ProductVariant.insertMany(variants);

    return res.redirect("/admin/product");
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).send("Server error");
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
    const product = await Product.findById(id);
    if (!product) return res.status(404).send("Product not found");

    // Track old image public_ids to delete later
    const oldImagePublicIds = product.images.map((img) => img.public_id);

    // === UPDATE BASIC FIELDS ===
    product.name = req.body.name;
    product.description = req.body.description;
    product.categoryId = new mongoose.Types.ObjectId(req.body.category);
    product.brand = req.body.brand;
    product.basePrice = parseFloat(req.body.price);
    product.discountPercentage = parseFloat(req.body.discount) || 0;

    // === HANDLE IMAGE REPLACEMENT & NEW IMAGES ===
    let currentImages = [...product.images]; // preserve existing

    // 1. Handle replaceImages[0..3]
    if (req.files) {
      for (let i = 0; i <= 3; i++) {
        const field = `replaceImages[${i}]`;
        if (req.files[field] && req.files[field][0]) {
          const newFile = req.files[field][0];
          const newImage = { url: newFile.path, public_id: newFile.filename };

          if (currentImages[i]) {
            // Mark old for deletion
            oldImagePublicIds.splice(
              oldImagePublicIds.indexOf(currentImages[i].public_id),
              1
            );
          }
          currentImages[i] = newImage; // Replace at index
        }
      }

      // 2. Handle new images[] (only if less than 4 total)
      if (req.files["images[]"]) {
        const newUploads = req.files["images[]"].map((file) => ({
          url: file.path,
          public_id: file.filename,
        }));

        const availableSlots = 4 - currentImages.filter((img) => img).length;
        const toAdd = newUploads.slice(0, availableSlots);

        currentImages = [...currentImages.filter((img) => img), ...toAdd];

        // Delete excess uploads
        const excess = newUploads.slice(availableSlots);
        for (const img of excess) {
          await deleteFromCloudinary(img.public_id);
        }
      }
    }

    // Final check: must have exactly 4
    if (currentImages.length !== 4) {
      return res.status(400).send("Product must have exactly 4 images");
    }

    product.images = currentImages;

    // === UPDATE VARIANTS ===
    const sizes = Array.isArray(req.body.size)
      ? req.body.size
      : [req.body.size].filter(Boolean);
    const additionalPrices = Array.isArray(req.body.additionalPrice)
      ? req.body.additionalPrice
      : [req.body.additionalPrice];
    const stocks = Array.isArray(req.body.stock)
      ? req.body.stock
      : [req.body.stock];
    const variantIds = Array.isArray(req.body.variantId)
      ? req.body.variantId
      : [req.body.variantId];

    // Delete removed variants
    const existingVariants = await ProductVariant.find({ productId: id });
    for (const variant of existingVariants) {
      if (!variantIds.includes(variant._id.toString())) {
        await ProductVariant.deleteOne({ _id: variant._id });
      }
    }

    // Update or create variants
    for (let i = 0; i < sizes.length; i++) {
      const data = {
        size: sizes[i]?.trim() || "Nil",
        additionalPrice: parseFloat(additionalPrices[i]) || 0,
        stock: parseInt(stocks[i]) || 0,
        productId: id,
      };

      if (variantIds[i] && mongoose.Types.ObjectId.isValid(variantIds[i])) {
        await ProductVariant.findByIdAndUpdate(variantIds[i], data);
      } else {
        await ProductVariant.create(data);
      }
    }

    await product.save();

    // === DELETE OLD IMAGES FROM CLOUDINARY ===
    for (const publicId of oldImagePublicIds) {
      if (
        publicId &&
        !currentImages.some((img) => img.public_id === publicId)
      ) {
        await deleteFromCloudinary(publicId);
      }
    }

    res.redirect("/admin/product");
  } catch (err) {
    console.error("Edit error:", err);
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

    let sortOption = { createdAt: -1 };
    if (sort) {
      if (sort === "name-az") sortOption = { name: 1 };
      if (sort === "name-za") sortOption = { name: -1 };
    }

    const userId = req.session?.user?._id;

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
              cond: {
                $and: [
                  { $eq: ["$$variant.status", true] },
                  { $gt: ["$$variant.stock", 0] },
                  true,
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
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          effectiveDiscount: {
            $cond: {
              if: { $gt: ["$discountPercentage", "$category.offerPercentage"] },
              then: "$discountPercentage",
              else: { $ifNull: ["$category.offerPercentage", 0] },
            },
          },
        },
      },
      {
        $addFields: {
          oldPrice: {
            $add: [
              { $toDouble: "$basePrice" },
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
                        $divide: [{ $ifNull: ["$effectiveDiscount", 0] }, 100],
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
      ...(priceRange
        ? [
            {
              $match: {
                finalPrice: {
                  $gte: parseInt(priceRange.split("-")[0]),
                  $lte: parseInt(priceRange.split("-")[1]),
                },
              },
            },
          ]
        : []),

      ...(sort === "price-low"
        ? [{ $sort: { finalPrice: 1 } }]
        : sort === "price-high"
        ? [{ $sort: { finalPrice: -1 } }]
        : sort === "best-selling"
        ? [
            {
              $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "items.productId",
                as: "orderData",
              },
            },
            {
              $addFields: {
                totalSold: {
                  $sum: {
                    $map: {
                      input: "$orderData",
                      as: "order",
                      in: {
                        $sum: {
                          $map: {
                            input: {
                              $filter: {
                                input: "$$order.items",
                                as: "i",
                                cond: { $eq: ["$$i.productId", "$_id"] },
                              },
                            },
                            as: "i",
                            in: "$$i.quantity",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            { $sort: { totalSold: -1 } },
          ]
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
      const discountPercentage = parseFloat(
        product.discountPercentage > product.category.offerPercentage
          ? product.discountPercentage
          : product.category.offerPercentage || 0
      );
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
        isFavourite: !!(
          variant && wishlistItems.includes(variant._id.toString())
        ),
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
    const discountPercentage = parseFloat(
      product.discountPercentage > product.category.offerPercentage
        ? product.discountPercentage
        : product.category.offerPercentage || 0
    );
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

    let cartItems = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }, "items.variantId").lean();
      cartItems = cart?.items?.map((item) => item.variantId.toString()) || [];
    }

    const category = await Category.findById(product.categoryId);
    const updatedRelatedProducts = relatedProducts.map((p) => {
      const additionalPrice = parseFloat(
        p.selectedVariant?.additionalPrice || 0
      );
      const basePrice = parseFloat(p.basePrice || 0);
      const discountPercentage = parseFloat(
        p.discountPercentage > category.offerPercentage
          ? p.discountPercentage
          : category.offerPercentage || 0
      );
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
        wishlistProductIds = wishlist.products.map((product) =>
          product.productId.toString()
        );
        isInWishlist = wishlistProductIds.includes(product._id.toString());
      }
    }

    const relatedWithWishlist = updatedRelatedProducts.map((p) => {
      const variantId = p.selectedVariant?._id?.toString();
      const isInCart = variantId && cartItems.includes(variantId);
      const isInWishlist = wishlistProductIds.includes(p._id.toString());

      return {
        ...p,
        isInWishlist,
        isInCart,
      };
    });

    const breadcrumbs = [
      { name: "Home", url: "/" },
      {
        name: product.category?.name || "Category",
        url: `/products?category=${product.categoryId}`,
      },
      { name: product.name, url: null },
    ];

    res.render("user/productDetail", {
      title: "Product Details",
      layout: "layouts/userLayout",
      user: req.session.user,
      product: productData,
      relatedProducts: relatedWithWishlist,
      isInWishlist,
      isExistingInCart: !!(
        variant && cartItems.includes(variant._id.toString())
      ),
      breadcrumbs,
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
