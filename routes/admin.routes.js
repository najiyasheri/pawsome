const express=require('express')
const router=express.Router()
const authController=require('../controllers/authController')
const homeController=require('../controllers/homeController')



router.get('/login',authController.loadAdminLogin)
router.post('/login',authController.postAdminLogin)

router.get('/dashboard',homeController.loadAdminDashboard)


module.exports=router