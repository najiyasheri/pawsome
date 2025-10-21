const Coupon = require("../models/Coupon");

// -------------------- Load Coupon Management Page --------------------
const loadCouponPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = search ? { code: { $regex: search, $options: "i" } } : {};

    const totalCoupons = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("admin/couponManagement", {
      title: "Coupon Management",
      layout: "layouts/adminLayout",
      coupons,
      currentPage: page,
      totalPages,
      search,
      totalCoupons,
    });
  } catch (error) {
    console.log("Error loading coupon page:", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadCreateCouponPage = async (req, res) => {
  try {
    res.render("admin/createCoupon", {
      title: "Create Coupon",
      layout: "layouts/adminLayout",
    });
  } catch (error) {
    console.log("Error loading create coupon page:", error);
    res.status(500).send("Internal Server Error");
  }
};

// -------------------- Create Coupon --------------------
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountValue,
      validFrom,
      validUntil,
      usageLimit,
      minPurchase,
    } = req.body;

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists!" });
    }

    const newCoupon = new Coupon({
      code,
      discountValue,
      validFrom,
      validUntil,
      usageLimit,
      minPurchase,
    });

    await newCoupon.save();
    res.redirect("/admin/coupon");
  } catch (error) {
    console.log("Error creating coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};
const loadEditCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).send("Coupon not found");
    res.render("admin/editCoupon", {
      coupon,
      title: "editCoupon",
      layout: "layouts/adminLayout",
    });
  } catch (error) {
    console.log("Error loading coupon for edit:", error);
    res.status(500).send("Internal Server Error");
  }
};

// -------------------- Update Coupon --------------------
const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discountValue,
      validFrom,
      validUntil,
      usageLimit,
      minPurchase,
    } = req.body;

    await Coupon.findByIdAndUpdate(id, {
      code,
      discountValue,
      validFrom,
      validUntil,
      usageLimit,
      minPurchase,
    });

    res.redirect("/admin/coupon");
  } catch (error) {
    console.log("Error updating coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

// -------------------- Delete Coupon --------------------
const deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await Coupon.findByIdAndDelete(id);
    res.redirect("/admin/coupon");
  } catch (error) {
    console.log("Error deleting coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    const userId = req.session.user._id;
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });
    const now = new Date();

    if (!coupon)
      return res.json({ success: false, message: "Invalid coupon code" });

    if (now < coupon.validFrom || now > coupon.validUntil)
      return res.json({
        success: false,
        message: "Coupon expired or not yet valid",
      });
    const amount = parseFloat(subtotal);  
    if (amount < coupon.minPurchase)
      return res.json({
        success: false,
        message: `Minimum purchase ₹${coupon.minPurchase} required`,
      });

    let discount = coupon.discountValue;

    if (coupon.usedBy.includes(userId)) {
      return res.json({
        success: false,
        message: "Coupon alrdy used",
      });
    }

    res.json({
      success: true,
      discount,
      message: "Coupon applied successfully",
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Error applying coupon" });
  }
};

module.exports = {
  loadCouponPage,
  createCoupon,
  loadEditCoupon,
  updateCoupon,
  deleteCoupon,
  loadCreateCouponPage,
  applyCoupon,
};
