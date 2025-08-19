const User=require('../models/userSchema')

const loadLoginPage = async (req, res) => {
  try {
    return res.render("user/login");
  } catch (error) {
    console.log("login page is loading");
    res.status(500).send("server error loading Login page");
  }
};

const loadSignupPage = async (req,res) => {
  try {
    return res.render("user/signup")
  } catch (error) {
    console.log('signup page is loading')
    res.status(500).send("server error loading signup page")
    
  }
}

const loadOtpPage=async(req,res)=>{
  try{
    return res.render('user/otp')
  }catch(error){
    console.log('otp page is loading')
    res.status(500).send('server error loading otp page')
  }
}

const loadForgotpassword=async(req,res)=>{
  try{
    return res.render('user/forgotpassword')
  }catch(error){
    console.log('forgotpassword page is loading')
    res.status(500).send('server error loading forgotpassword page')
  }
}

const loadResetpassword=async(req,res)=>{
  try{
    return res.render('user/resetpassword')
  }catch(error){
    console.log('forgotpassword page is loading')
    res.status(500).send('server error loading forgotpassword page')
  }
}

const signup=async(req,res)=>{
  const{name,email,password}=req.body
  try{
 const newUser=new User({name,email,password})
 await newUser.save()
 return res.redirect('/signup')
  }
  catch(error){
     console.error('error for save user',error)
     res.status(500).send('internal server error')
  }
}


const loadAdminLogin = async (req,res) => {

}                                   

module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadOtpPage,
  loadForgotpassword,
  loadResetpassword,
  signup,
  loadAdminLogin
};
