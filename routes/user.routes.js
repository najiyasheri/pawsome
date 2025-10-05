const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const homeController = require("../controllers/homeController");
const {isLogin, isUser}=require('../middlewares/authMiddleware');
const passport = require("passport");
const cartController=require('../controllers/cartController')
const productController=require('../controllers/productController')
const { loadProductDetails } = require("../controllers/productController")
const profileController=require('../controllers/profileController')
const addressController=require('../controllers/addressController')
const shippingController=require('../controllers/shippingController')
const paymentController=require('../controllers/paymentContoller')
const orderController=require('../controllers/orderController')

router.get("/", homeController.loadHomepage);
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
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login'}),authController.googleAuth)

router.get('/products',productController.userProducts)
router.get('/product/:id',productController.loadProductDetails)

router.get("/cart", isUser,cartController.loadCart);
router.post("/cart/add", isUser,cartController.addToCart);
router.post("/cart/update", isUser,cartController.updateCart);
router.post("/cart/remove", isUser,cartController.removeCart);

router.get('/profile',isUser,profileController.loadProfile)
router.post('/profile',isUser,profileController.postProfile)

router.get("/address", isUser,addressController.loadAddress);
router.post("/address/add",isUser, addressController.addAddress);
router.get("/address/edit/:id", isUser,addressController.editAddress);
router.post("/address/edit/:id", isUser,addressController.postEdit);
router.post("/address/delete/:id", isUser,addressController.deleteAddress);

router.get("/shipping", isUser,shippingController.loadShipping);
router.post("/shipping/save",isUser, shippingController.saveShipping);

router.get('/payment',isUser,paymentController.loadPayment)
router.post("/success", isUser,paymentController.processPayment);

router.get("/myOrders", orderController.loadUserOrders);




module.exports = router;
