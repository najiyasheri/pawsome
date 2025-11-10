const Coupon = require("../models/Coupon");

const loadCouponPage = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const query = search ? { code: { $regex: search, $options: "i" } } : {};

    const totalCoupons = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("admin/couponManagement", {
      title: "Coupon-Management",
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

const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountValue,
      validFrom,
      validUntil,
      minPurchase,
    } = req.body;

    // ✅ Basic field validation
    if (!code || !discountValue || !validFrom || !validUntil) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all required fields" });
    }

    // ✅ Convert to numbers
    const discountNum = parseFloat(discountValue);
    const minPurchaseNum = parseFloat(minPurchase);

    if (isNaN(discountNum) || isNaN(minPurchaseNum)) {
      return res.status(400).json({
        success: false,
        message: "Discount value and minimum purchase must be valid numbers",
      });
    }

    // ✅ Check date validity
    if (new Date(validFrom) > new Date(validUntil)) {
      return res.status(400).json({
        success: false,
        message: "'Valid From' cannot be after 'Valid Until'",
      });
    }

    // ✅ Check negative values
    if (minPurchaseNum < 0 || discountNum < 0) {
      return res.status(400).json({
        success: false,
        message: "Values cannot be negative",
      });
    }

    // ✅ Ensure minPurchase > discount
    if (minPurchaseNum <= discountNum) {
      return res.status(400).json({
        success: false,
        message: "Minimum purchase amount must be greater than discount value",
      });
    }

    // ✅ Check duplicate code
    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists!" });
    }

    // ✅ Save coupon
    const newCoupon = new Coupon({
      code,
      discountValue: discountNum,
      validFrom,
      validUntil,
      minPurchase: minPurchaseNum,
    });

    await newCoupon.save();
    res.status(200).json({ success: true, redirect: "/admin/coupon" });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).send("Internal Server Error");
  }
};

const loadEditCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.redirect(
        `/admin/coupon?error=${encodeURIComponent("Coupon not found")}`
      );
    }

    let error = req.query.error;
    let success = req.query.success;

    res.render("admin/editCoupon", {
      title: "Edit Coupon",
      layout: "layouts/adminLayout",
      coupon,
      error,
      success,
    });
  } catch (error) {
    console.error("Error loading coupon for edit:", error);
    res.redirect(
      `/admin/coupon?error=${encodeURIComponent("Something went wrong")}`
    );
  }
};

const updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      discountValue,
      validFrom,
      validUntil,
      minPurchase,
    } = req.body;

    if (!code || !discountValue || !validFrom || !validUntil) {
      return res.redirect(
        `/admin/coupons/${id}/edit?error=${encodeURIComponent(
          "Please fill all required fields"
        )}`
      );
    }

    if (new Date(validFrom) > new Date(validUntil)) {
      return res.redirect(
        `/admin/coupons/${id}/edit?error=${encodeURIComponent(
          "'Valid From' cannot be after 'Valid Until'"
        )}`
      );
    }

    if (
      Number(minPurchase) &&
      Number(discountValue) &&
      Number(minPurchase) <= Number(discountValue)
    ) {
      return res.redirect(
        `/admin/coupons/${id}/edit?error=${encodeURIComponent(
          "Minimum purchase must be greater than the discount value"
        )}`
      );
    }

    const existing = await Coupon.findOne({ code, _id: { $ne: id } });
    if (existing) {
      return res.redirect(
        `/admin/coupons/${id}/edit?error=${encodeURIComponent(
          "Coupon code already exists"
        )}`
      );
    }

    await Coupon.findByIdAndUpdate(id, {
      code,
      discountValue,
      validFrom,
      validUntil,
      minPurchase,
    });

    res.redirect("/admin/coupon");
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.redirect(
      `/admin/coupons/${req.params.id}/edit?error=${encodeURIComponent(
        "Something went wrong, please try again"
      )}`
    );
  }
};

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
