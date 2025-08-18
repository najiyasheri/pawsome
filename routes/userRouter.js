const express=require('express')
const router=express.Router()
const authController = require('../controllers/authController')
const homeController = require('../controllers/homeController')

router.get('/', homeController.loadHomepage)
router.get('/login',authController.loadLoginPage)
router.get('/signup',authController.loadSignupPage)

module.exports=router