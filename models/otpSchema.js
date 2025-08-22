const mongoose = require("mongoose");
const otpSchema = new mongoose.Schema(
  {
    otp: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    expiredAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
