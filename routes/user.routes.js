const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const homeController = require("../controllers/homeController");
const {userAuth,isLogin}=require('../middlewares/authMiddleware')

router.get("/",userAuth, homeController.loadHomepage);
router.get("/login",isLogin, authController.loadLoginPage);
router.get("/signup",isLogin, authController.loadSignupPage);

router.get("/forgotpassword",isLogin, authController.loadForgotpassword);
router.get("/resetpassword",isLogin, authController.loadResetpassword);
router.post("/signup",isLogin, authController.postSignup);
router.post("/resend-otp",isLogin, authController.resendOtp);
router.post("/otp",isLogin, authController.postOtp);
router.post('/login',isLogin,authController.postLogin)
router.post('/forgotpassword',isLogin,authController.postForgotpassword)
router.post('/resetpassword',isLogin,authController.postResetpassword)
router.post('/resendPasswordOtp',isLogin,authController.resetPasswordResendOtp)
router.get('/logout',authController.logoutUser)

module.exports = router;
