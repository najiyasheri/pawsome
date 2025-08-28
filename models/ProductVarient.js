const mongoose = require("mongoose");

const variantSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", 
      required: true
    },
    size: {
      type: Number, 
      required: true
    },
    additional_price: {
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
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

module.exports = mongoose.model("Variant", variantSchema);
