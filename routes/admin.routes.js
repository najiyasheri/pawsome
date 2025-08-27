const express=require('express')
const router=express.Router()
const authController=require('../controllers/authController')
const homeController=require('../controllers/homeController')
const{adminAuth, isLogin}=require('../middlewares/authMiddleware')
const userController=require('../controllers/userController')
const{loadUserManagement}=require('../controllers/userController')
const categoryController=require('../controllers/categoryController')

router.get('/users',loadUserManagement)
router.get('/login',isLogin,authController.loadAdminLogin)
router.post('/login',isLogin,authController.postAdminLogin)
router.get('/dashboard',adminAuth,homeController.loadAdminDashboard)
router.get('/users',adminAuth,userController.loadUserManagement)
router.get('/logout',authController.logoutAdmin)
router.get('/userBlocked',adminAuth,userController.userBlocked)
router.get('/userunBlocked',adminAuth,userController.userunBlocked)

router.route('/category')
.get(adminAuth,categoryController.getCategory)
.post(adminAuth,categoryController.addCategory)

router.get('/categoryBlock',adminAuth,categoryController.toggleBlock)

module.exports=router