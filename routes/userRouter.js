const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const homeController = require("../controllers/homeController");

router.get("/", homeController.loadHomepage);
router.get("/login", authController.loadLoginPage);
router.get("/signup", authController.loadSignupPage);

router.get("/forgotpassword", authController.loadForgotpassword);
router.get("/resetpassword", authController.loadResetpassword);
router.post("/signup", authController.postSignup);
router.post("/resend-otp", authController.resendOtp);
router.post("/otp", authController.postOtp);
router.post('/login',authController.postLogin)

module.exports = router;
