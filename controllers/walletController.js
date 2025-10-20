
const crypto = require("crypto");
const { razorpay } = require("../config/razorpay");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");


// -------------------- Load Wallet Page --------------------
const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5) // Show latest 5 transactions
        .lean();
    res.render("user/wallet", {
      walletBalance: wallet.balance,
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
      transactions,
      title: "wallet",
      layout: "layouts/userLayout",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// -------------------- Add Money to Wallet (Razorpay) --------------------
const addMoney = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const { amount } = req.body;
    if (!userId)
      return res
        .status(401)
        .json({ success: false, message: "Login required" });
    if (amount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
        const orderOptions = {
          amount: amount * 100, 
          currency: "INR",
          receipt: `wallet_${Date.now()}`,
          payment_capture: 1,
        };
        const order = await razorpay.orders.create(orderOptions);
    

    res.json({ success: true, order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// -------------------- Verify Wallet Top-Up --------------------
const verifyWalletPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
    } = req.body;
    const userId = req.session.user?._id;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      
      const wallet = await Wallet.findOneAndUpdate(
        { userId },
        { $inc: { balance: amount / 100 } }, // convert paise to rupees
        { new: true, upsert: true }
      );

      // Log transaction
         await Transaction.create({
           userId,
           type: "wallet_topup",
           transactionType: "credit",
           amount: amount / 100,
           paymentId: razorpay_payment_id,
           orderId: razorpay_order_id,
           description: "Wallet Top-up via Razorpay",
           balanceAfter: wallet.balance,
           status: "completed",
         });
    return res.json({ success: true, balance: wallet.balance }) }}
   catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// -------------------- View Wallet Transactions --------------------
const walletTransactions = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.render("user/wallet-transactions", {
      transactions,
      title: "Wallet Transactions",
      layout: "layouts/userLayout",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadWallet,
  addMoney,
  verifyWalletPayment,
  walletTransactions,
};
