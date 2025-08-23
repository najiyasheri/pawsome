const loadHomepage = async (req, res) => {
  try {
    return res.render("user/home");
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
  }
};

const loadAdminDashboard = async (req, res) => {
  try {
    return res.render("admin/dashboard");
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
  }
};


module.exports = {
    loadHomepage,
    loadAdminDashboard
}