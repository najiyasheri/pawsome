const OTP = require("../models/Otp");
const User = require("../models/User");
const {
  generateOTP,
  generateExpiry,
  sendOtp,
} = require("../helpers/otpHelper");


const postResendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    await OTP.deleteMany({ email });

    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    await new OTP({ email, otp, expiredAt }).save();
    await sendOtp(email, otp);

    res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};

const postProfileOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res
        .status(400)
        .json({ success: false, message: "Email required" });
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered",
      });
    }

    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpRecord = new OTP({ email, otp, expiredAt });
    await otpRecord.save();
    await sendOtp(email, otp);

    return res
      .status(200)
      .json({ success: true, message: "OTP sent. Check your email." });
  } catch (error) {
    console.error("Resend otp failed", error);
    res.status(500).send("Internal server error");
  }
};

const verifyProfileOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
  

    const userId = req.session?.user?._id;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User not logged in",
      });
    }

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "No OTP found for this email",
      });
    }

    if (otpRecord.expiredAt.getTime() < Date.now()) {
      await OTP.deleteOne({ email });
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (String(otpRecord.otp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Try again.",
      });
    }

    await User.findByIdAndUpdate(req.session.user._id, { email });

    await OTP.deleteOne({ email });

    res
      .status(200)
      .json({
        success: true,
        message: "Email updated successfully",
        newEmail: email,
      });
  } catch (error) {
    console.error("OTP verification failed:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { postProfileOtp, verifyProfileOtp , postResendOtp};
