const express=require('express')
const router=express.Router()
const authController = require('../controllers/authController')
const homeController = require('../controllers/homeController')

router.get('/', homeController.loadHomepage)
router.get('/login',authController.loadLoginPage)
router.get('/signup',authController.loadSignupPage)
router.get('/otp',authController.loadOtpPage)
router.get('/forgotpassword',authController.loadForgotpassword)
router.get('/resetpassword',authController.loadResetpassword)
router.post('/signup',authController.signup)

module.exports=router