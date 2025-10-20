
const crypto = require("crypto");
const { razorpay } = require("../config/razorpay");
const Wallet = require("../models/Wallet");

// -------------------- Load Wallet Page --------------------
const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0, transactions: [] });
    }

    res.render("user/wallet", {
      walletBalance: wallet.balance,
       RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
       title:'wallet',
       layout:'layouts/userLayout'
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
        // Create Razorpay order
        const orderOptions = {
          amount: amount * 100, // in paise
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
      wallet.transactions.push({ 
        type: "CREDIT",
        amount: amount / 100,
        description: "Wallet Top-up via Razorpay",
      });
      await wallet.save();

      return res.json({ success: true, balance: wallet.balance });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// -------------------- View Wallet Transactions --------------------
const walletTransactions = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.redirect("/login");

    const wallet = await Wallet.findOne({ userId });
    const transactions = wallet
      ? wallet.transactions.sort((a, b) => b.createdAt - a.createdAt)
      : [];

    res.render("wallet-transactions", { transactions });
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
