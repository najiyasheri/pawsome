const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validUntil: {
    type: Date,
    required: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  minPurchase: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
