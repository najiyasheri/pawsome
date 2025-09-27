const User = require("../models/User");
const bcrypt = require("bcrypt");
const OTP = require("../models/Otp");
const {
  generateOTP,
  generateExpiry,
  sendOtp,
} = require("../helpers/otpHelper");

const saltRound = 10;

const loadLoginPage = async (req, res) => {
  try {
    let msg = req.query.msg;
    return res.render("user/login", {
      layout: "layouts/userLayout",
      msg,
      user: null,
      title: "User Login",
    });
  } catch (error) {
    console.log("login page is loading");
    res.status(500).send("server error loading Login page");
  }
};

const loadSignupPage = async (req, res) => {
  try {
    return res.render("user/signup", {
      layout: "layouts/userLayout",
      user: null,
      title: "User Signup",
    });
  } catch (error) {
    console.log("signup page is loading");
    res.status(500).send("server error loading signup page");
  }
};

const loadForgotpassword = async (req, res) => {
  try {
    return res.render("user/forgotpassword", { layout: false });
  } catch (error) {
    console.log("forgotpassword page is loading");
    res.status(500).send("server error loading forgotpassword page");
  }
};

const loadResetpassword = async (req, res) => {
  try {
    const email = req.session.resetEmail;
    return res.render("user/resetpassword", { layout: false });
  } catch (error) {
    console.log("forgotpassword page is loading");
    res.status(500).send("server error loading forgotpassword page");
  }
};

const postSignup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!password) {
      return res.render("user/signup", { error: "Password is required" });
    }

    const verifiedUser = await User.findOne({ email, isVerified: true });
    if (verifiedUser) {
      return res.render("user/signup", { email, error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, saltRound);

    const newUser = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          name,
          email,
          password: hashedPassword,
          isVerified: false,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    await OTP.findOneAndUpdate(
      { email },
      { otp, expiredAt },
      { upsert: true, new: true }
    );

    await sendOtp(email, otp);

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
    await sendOtp(email, otp);
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
      console.log("user not found");
      return res.render("user/login", {
        email,
        error: "Invalid email or password",
      });
    }
    if (!userRecord.isVerified) {
      console.log(" user is not verified");
      return res.render("user/login", {
        email,
        error: "Invalid email or password",
      });
    }

    if (userRecord.isBlocked) {
      console.log("user is blocked");
      return res.render("user/login", {
        email,
        error: "user is blocked",
      });
    }

    const isMatch = await bcrypt.compare(password, userRecord.password);
    if (!isMatch) {
      console.log("password is not matching");
      return res.render("user/login", {
        email,
        error: "Invalid email or password",
      });
    }

    req.session.user = userRecord;

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
    await sendOtp(email, otp);

    req.session.resetEmail = email;

    return res.redirect("/resetpassword");
  } catch (error) {
    console.error("Resend otp failed");
    res.status(500).send("Internal server error");
  }
};

const postResetpassword = async (req, res) => {
  try {
    const { otp, password } = req.body;
    const email = req.session.resetEmail;
    const userRecord = await User.findOne({ email });
    if (!userRecord) {
      return res.render("user/resetpassword", {
        email,
        error: "Something went wrong",
      });
    }

    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.expiredAt < new Date()) {
      return res.render("user/resetpassword", {
        email,
        error: "Invalid or expired OTP",
      });
    }

    if (Number(otp) !== otpRecord.otp) {
      return res.render("user/resetpassword", {
        email,
        error: "Invalid or expired OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRound);
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    console.log(password, email, hashedPassword);

    await OTP.deleteMany({ email });
    return res.redirect("/login?msg=Reset Password Successfully");
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).send("Internal server error during OTP verification");
  }
};

const resetPasswordResendOtp = async (req, res) => {
  const email = req.session.resetEmail;
  try {
    await OTP.deleteMany({ email });
    const otp = generateOTP();
    const expiredAt = generateExpiry(5);
    const otpRecord = new OTP({ email, otp, expiredAt });
    await otpRecord.save();
    await sendOtp(email, otp);
    return res.render("user/resetpassword", { email });
  } catch (error) {
    console.error("Resend otp failed");
    res.status(500).send("Internal server error");
  }
};

const loadAdminLogin = async (req, res) => {
  try {
    return res.render("admin/login", { layout: false });
  } catch (error) {
    console.log("login page is loading");
    res.status(500).send("Server error loading login page");
  }
};

const postAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userRecord = await User.findOne({ email });

    if (!userRecord) {
      return res.render("admin/login", {
        error: "User not exist",
        layout: false,
      });
    }

    if (!userRecord.isAdmin) {
      return res.render("admin/login", {
        error: "You are not authorized",
        layout: false,
      });
    }
    const isMatch = await bcrypt.compare(password, userRecord.password);

    if (!isMatch) {
      return res.render("admin/login", {
        error: "Incorrect Password,Please Try Again ",
        layout: false,
      });
    }
    req.session.user = userRecord;
    return res.redirect("dashboard");
  } catch (error) {
    console.log("Admin login error", error);
    res.status(500).send("Internal server error");
  }
};

const logoutUser = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.redirect("/home");
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.log("Admin logout error", error);
    res.status(500).send("Internal server error");
  }
};

const logoutAdmin = (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log(err);
        return res.redirect("/admin/dashboard");
      }

      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("Admin logout error", error);
    res.status(500).send("Internal server error");
  }
};

const googleAuth = async (req, res) => {
  try {
    const { name, email, picture } = req.user?._json;
    const isExist = await User.findOne({ email });
    let newUser;
    if (!isExist) {
      newUser = new User({ name, email, picture });
      await newUser.save();
    }
    req.session.user = isExist || newUser;
    return res.redirect("/");
  } catch (error) {
    console.error("error for google auth", error);
    res.status(500).send("internal server error");
  }
};

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
  resetPasswordResendOtp,
  postAdminLogin,
  logoutUser,
  logoutAdmin,
  googleAuth,
};
