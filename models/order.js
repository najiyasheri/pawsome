const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "WALLET", "ONLINE"],
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingType: {
      type: String,
      enum: ["Express", "Regular"],
      default: "Regular",
    },
    address: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        image: { type: String },
        variant: {
          id: { type: mongoose.Schema.Types.ObjectId },
          size: { type: String },
          color: { type: String },
          additionalPrice: { type: Number, default: 0 },
        },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        oldPrice: { type: Number },
        discount: { type: Number, default: 0 },
        subtotal: { type: Number, required: true },
        status: {
          type: String,
          enum: [
            "Cancelled",
            "Returned",
          ],
        },
        cancellationReason: { type: String },
      },
    ],
    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
