
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

const loadAdminLogin = async (req,res) => {

}                                   

module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadOtpPage,
  loadAdminLogin
};
