const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const homeController = require("../controllers/homeController");
const {isLogin, isUser}=require('../middlewares/authMiddleware');
const passport = require("passport");
const cartController=require('../controllers/cartController')
const productController=require('../controllers/productController')

const profileController=require('../controllers/profileController')
const addressController=require('../controllers/addressController')

const paymentController=require('../controllers/paymentContoller')
const orderController=require('../controllers/orderController')
const profileOtpController=require('../controllers/profileOtpController')
const { requireCartNotEmpty } = require("../middlewares/checkoutMiddleware");
const wishlistController=require('../controllers/wishlistController')





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
router.post("/cart/add",cartController.addToCart);
router.post("/cart/update", isUser,cartController.updateCart);
router.post("/cart/remove", isUser,cartController.removeCart);

router.get('/profile',isUser,profileController.loadProfile)
router.post('/profile',isUser,profileController.postProfile)

router.get(
  "/address",
  isUser,
  requireCartNotEmpty,
  addressController.loadAddress
);
router.post("/address/add",isUser, addressController.addAddress);
router.get("/myAddress/edit/:id", isUser,addressController.editAddress);
router.post("/myAddress/edit/:id", isUser,addressController.postEdit);
router.post("/myAddress/delete/:id", isUser,addressController.deleteAddress);

// router.get("/shipping", isUser,shippingController.loadShipping);
// router.post("/shipping/save",isUser, shippingController.saveShipping);

router.get('/payment',isUser,requireCartNotEmpty,paymentController.loadPayment)
router.post("/success", isUser,paymentController.processPayment);

router.get("/orders",isUser, orderController.loadUserOrders);

router.post('/profileOtp',profileOtpController.postProfileOtp)

router.post("/profileOtp-verify", profileOtpController.verifyProfileOtp);

router.post("/profileOtp-resend",profileOtpController.postResendOtp)

router.get("/myAddress",isUser,addressController.loadMyAddress);

router.post("/myAddress/add", isUser, addressController.addMyAddress);

router.get("/order/:id", isUser, orderController.loadUserOrderDetail);
router.post(
  "/order/:orderId/cancel-item/:itemId",isUser,
  orderController.userCancelSingleItem
);
router.post(
  "/order/:orderId/cancel-all",
  isUser,
  orderController.userCancelEntireOrder
);



router.get("/wishlist", isUser, wishlistController.viewWishlist);

router.post(
  "/wishlist/add/:productId/:variantId",
  isUser,
  wishlistController.addToWishlist
);

router.post(
  "/wishlist/remove/:productId",
  isUser,
  wishlistController.removeFromWishlist
);
module.exports = router;
