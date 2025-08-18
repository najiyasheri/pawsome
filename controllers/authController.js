
const loadLoginPage = async (req, res) => {
  try {
    return res.render("user/login");
  } catch (error) {
    console.log("login page is loading");
    res.status(500).send("server error loading Login page");
  }
};

const loadSignupPage = async (req,res) => {

}

const loadAdminLogin = async (req,res) => {

}

module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadAdminLogin
};
