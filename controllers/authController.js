const User = require("../models/userSchema");
const bcrypt = require("bcrypt");
const OTP = require("../models/otpSchema");
const { generateOTP, generateExpiry, sendOtp } = require("../helpers/otpHelper");


const saltRound = 10;

const loadLoginPage = async (req, res) => {
  try {
    let msg = req.query.msg;
    return res.render("user/login", { msg });
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
    const isUserExists=await User.findOne({email})
    if(isUserExists){
      return res.render('user/signup', {email,error:'User already exists'})
    }
    const hashedPassword = await bcrypt.hash(password, saltRound);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpData = new OTP({ email, otp, expiredAt });
    await otpData.save();
    await sendOtp(email,otp)
    return res.render("user/otp", { email });
  } catch (error) {
    console.error("error for save user", error);
    res.status(500).send("internal server error");
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;
  try {
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpRecord = new OTP({ email, otp, expiredAt });
    await otpRecord.save();
    await sendOtp(email,otp)
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
        error: "Invalid or expired OTP",
      });
    }
    if (otpRecord.expiredAt < new Date()) {
      return res.render("user/otp", {
        email,
        error: "Invalid or expired OTP",
      });
    }
    if (otpRecord.otp !== Number(otp)) {
      return res.render("user/otp", {
        email,
        error: "Invalid or expired OTP",
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
      console.log('user not found')
      return res.render("user/login", {
        email,
        error: "Invalid email or password",
      });
    }
    if (!userRecord.isVerified) {
      console.log(' user is not verified')
      return res.render("user/login", {
        email,
        error: "Invalid email or password",
      });
    }
    console.log(password)
    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      console.log('password is not matching')
      return res.render("user/login", { email, error: "Invalid email or password" });
    }
    return res.redirect("/");
  } catch {
    console.error("Login verification error:", error);
    res.status(500).send("Internal server error during Login verification");
  }
};

const postForgotpassword = async (req, res) => {
  const { email } = req.body;
  console.log("entering here", email);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("user/forgotpassword", {
        error: "Invalid email ",
      });
    }
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpRecord = new OTP({ email, otp, expiredAt });
    await otpRecord.save();
     await sendOtp(email,otp)

    return res.render("user/resetpassword", { email });
  } catch (error) {
    console.error("Resend otp failed");
    res.status(500).send("Internal server error");
  }
};

const postResetpassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord || otpRecord.expiredAt < new Date()) {
      return res.render("user/resetpassword", {
        email,
        error: "",
      });
    }

    if (Number(otp) !== otpRecord.otp) {
      return res.render("user/resetpassword", { email, error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRound);
    await User.updateOne({ email },{ $set: { password: hashedPassword } })

    console.log(password, email , hashedPassword)

    await OTP.deleteMany({ email });
    return res.redirect("/login?msg=Reset Password Successfully");
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).send("Internal server error during OTP verification");
  }
};

const resetPasswordResendOtp = async (req,res) => {
    const { email } = req.body;
  try {
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpRecord = new OTP({ email, otp, expiredAt });
    await otpRecord.save();
    await sendOtp(email,otp)
    return res.render("user/resetpassword", { email });
  } catch (error) {
    console.error("Resend otp failed");
    res.status(500).send("Internal server error");
  }
}

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
  postForgotpassword,
  postResetpassword,
  resetPasswordResendOtp
};
