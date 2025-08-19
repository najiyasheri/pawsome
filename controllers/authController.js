
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



const loadAdminLogin = async (req,res) => {

}                                   

module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadOtpPage,
  loadForgotpassword,
  loadResetpassword,
  loadAdminLogin
};
