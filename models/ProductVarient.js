const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", 
      required: true
    },
    size: {
      type: String, 
      required: true
    },
    additionalPrice: {
      type: Number, 
      default: 0
    },
    stock: {
      type: Number, 
      required: true,
      min: 0
    },
    status: {
      type:Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Variant", variantSchema);
