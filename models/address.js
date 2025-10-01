const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  phone: String,
  type: String, 
  address: String,
  default: { type: Boolean, default: false },
});

module.exports = mongoose.model("Address", addressSchema);
