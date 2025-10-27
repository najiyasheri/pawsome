const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const homeController = require("../controllers/homeController");
const { adminAuth, isLogin } = require("../middlewares/authMiddleware");
const userController = require("../controllers/userController");
const categoryController = require("../controllers/categoryController");
const productController = require("../controllers/productController");
const uploadProductImages = require("../middlewares/multer");
const orderController = require("../controllers/orderController");
const couponController = require("../controllers/couponController");


router.get("/login", isLogin, authController.loadAdminLogin);
router.post("/login", isLogin, authController.postAdminLogin);
router.get("/users", adminAuth, userController.loadUserManagement);
router.get("/logout", authController.logoutAdmin);
router.get("/user/toggleBlock", adminAuth, userController.toggleBlock);
router.get("/user/:id",adminAuth,userController.viewUserDetails);

router
  .route("/category")
  .get(adminAuth, categoryController.getCategory)
  .post(adminAuth, categoryController.addCategory);

router.get("/categoryBlock", adminAuth, categoryController.toggleBlock);
router.post("/category/edit/:id", adminAuth, categoryController.categoryEdit);

router.get("/product", adminAuth, productController.loadProductManagement);
router
  .route("/product/add")
  .get(adminAuth, productController.loadAddProduct)
  .post(adminAuth, uploadProductImages, productController.addProduct);

router.get("/product/block", adminAuth, productController.toggleBlock);

router.get("/product/edit/:id", adminAuth, productController.loadEditProduct);
router.post(
  "/product/edit/:id",
  adminAuth,
  uploadProductImages,
  productController.postEditProduct
);
router.get("/product/view/:id", productController.loadProductDetailAdmin);

router.get("/order", adminAuth, orderController.loadOrder);
router.get("/order/:id", adminAuth, orderController.loadOrderDetail);
router.post(
  "/order/:orderId/cancel-item/:itemId",
  adminAuth,
  orderController.cancelSingleItem
);

router.post(
  "/order/:orderId/cancel-all",
  adminAuth,
  orderController.cancelEntireOrder
);

router.post(
  "/order/:orderId/update-status",
  adminAuth,
  orderController.updateOrderStatus
);

router.get("/coupon", adminAuth,couponController.loadCouponPage);
router.get("/coupons/create", adminAuth, couponController.loadCreateCouponPage);
router.post("/coupons/create", adminAuth,couponController.createCoupon);
router.get("/coupons/:id/edit", adminAuth, couponController.loadEditCoupon);
router.post("/coupons/update/:id", adminAuth, couponController.updateCoupon);
router.post("/coupons/delete/:id", adminAuth, couponController.deleteCoupon);

router.get("/dashboard", adminAuth,homeController.loadDashboard);


module.exports = router;
