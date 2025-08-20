const mongoose = require("mongoose");
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowerCase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profile_image: {
      type: String,
      default: null,
    },
    is_Blocked: {
      type: Boolean,
      default: false,
    },
    is_Verified: {
      type: Boolean,
      default: false,
    },
    is_Admin: {
      type: Boolean,
      default: false,
    },
    google_id: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


module.exports = mongoose.model("User", userSchema);
