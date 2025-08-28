const mongoose = require("mongoose");
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    offers_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    return_within: {
      type: Date,
      default: () => {
        let date = new Date();
        date.setDate(date.getDate() + 7); 
        return date;
      },
    },
    is_Blocked: {
      type: Boolean,
      default: false,
    },
    base_price: {
      type: mongoose.Types.Decimal128,
      required: true,
    },
    discount_percentage: {
      type: mongoose.Types.Decimal128,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("Product", productSchema);
