const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "order_payment",
        "wallet_topup",
        "refund",
        "cashback",
        "referral_bonus",
        "coupon_applied",
        "admin_credit",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },


    transactionType: {
      type: String,
      enum: ["credit", "debit"], 
      required: true,
    },

    orderId: {
      type: String,
      ref: "Order",
    },

    paymentId: {
      type: String,
    },

    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
    },

    description: {
      type: String,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },


    balanceAfter: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
