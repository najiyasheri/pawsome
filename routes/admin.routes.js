const express=require('express')
const router=express.Router()
const authController=require('../controllers/authController')
const homeController=require('../controllers/homeController')
const{adminAuth, isLogin}=require('../middlewares/authMiddleware')
const userController=require('../controllers/userController')



router.get('/login',isLogin,authController.loadAdminLogin)
router.post('/login',isLogin,authController.postAdminLogin)
router.get('/dashboard',adminAuth,homeController.loadAdminDashboard)
router.get('/users',adminAuth,userController.loadUserManagement)

module.exports=router