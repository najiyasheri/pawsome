const User = require("../models/userSchema");
const bcrypt = require("bcrypt");
const OTP = require("../models/otpSchema");
const { generateOTP, generateExpiry } = require("../helpers/otpHelper");

const saltRound = 10;

const loadLoginPage = async (req, res) => {
  try {
    return res.render("user/login");
  } catch (error) {
    console.log("login page is loading");
    res.status(500).send("server error loading Login page");
  }
};

const loadSignupPage = async (req, res) => {
  try {
    return res.render("user/signup");
  } catch (error) {
    console.log("signup page is loading");
    res.status(500).send("server error loading signup page");
  }
};

const loadForgotpassword = async (req, res) => {
  try {
    return res.render("user/forgotpassword");
  } catch (error) {
    console.log("forgotpassword page is loading");
    res.status(500).send("server error loading forgotpassword page");
  }
};

const loadResetpassword = async (req, res) => {
  try {
    return res.render("user/resetpassword");
  } catch (error) {
    console.log("forgotpassword page is loading");
    res.status(500).send("server error loading forgotpassword page");
  }
};

const postSignup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, saltRound);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpData = new OTP({ email, otp, expiredAt });
    await otpData.save();
    return res.render("user/otp", { email });
  } catch (error) {
    console.error("error for save user", error);
    res.status(500).send("internal server error");
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  console.log("entering here", email);
  try {
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expired_at = generateExpiry(5);
    const otpData = new OTP({ email, otp, expired_at });
    await otpData.save();
    return res.render("user/otp", { email });
  } catch (error) {
    console.error("Resend otp failed");
    res.status(500).send("Internal server error");
  }
};

const postOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.render("user/otp", {
        email,
        error: "OTP not found,please resend",
      });
    }
    if (otpRecord.expiredAt < new Date()) {
      return res.render("user/otp", {
        email,
        error: "OTP expired,please resend",
      });
    }
    if (otpRecord.otp !== Number(otp)) {
      return res.render("user/otp", {
        email,
        error: "Invalid OTP,please try again",
      });
    }
    await User.updateOne({ email }, { $set: { isVerified: true } });
    await OTP.deleteOne({ email });
    return res.redirect("/login");
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).send("Internal server error during OTP verification");
  }
};

const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRecord = await User.findOne({ email });
    if (!userRecord) {
      return res.render("user/login", {
        email,
        error: "User is not existing",
      });
    }
    if (!userRecord.isVerified) {
      return res.render("user/login", {
        email,
        error: "User is not verified",
      });
    }
    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      return res.render("user/login", {email,
        error: "Invalid password",
      });
    }
    return res.redirect('/')
  } catch {
    console.error("Login verification error:", error);
    res.status(500).send("Internal server error during Login verification");
  }
};

const loadAdminLogin = async (req, res) => {};

module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadForgotpassword,
  loadResetpassword,
  postSignup,
  loadAdminLogin,
  resendOtp,
  postOtp,
  postLogin,
};
