// models/Wallet.js
const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  balance: { type: Number, default: 0 },
  transactions: [
    {
      type: { type: String, enum: ["CREDIT", "DEBIT"], required: true },
      amount: { type: Number, required: true },
      date: { type: Date, default: Date.now },
      description: String,
    },
  ],
});

module.exports = mongoose.model("Wallet", walletSchema);
