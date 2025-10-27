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
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: {
      type: String,
      required: true,
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
    isBlocked: {
      type: Boolean,
      default: false,
    },
    basePrice: {
      type: mongoose.Types.Decimal128,
      get: (v) => parseFloat(v.toString()),
      required: true,
    },
    discountPercentage: {
      type: mongoose.Types.Decimal128,
      get: (v) => parseFloat(v.toString()),
      default: 0,
    },
  }, {
    timestamps: true,
  },
   { toJSON: { getters: true }, toObject: { getters: true } },
 
);

module.exports = mongoose.model("Product", productSchema);
