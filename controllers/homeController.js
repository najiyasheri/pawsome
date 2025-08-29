const loadHomepage = async (req, res) => {
  try {
    
    return res.render("user/home", 
    { title: "HomePage",
      layout: "layouts/userLayout",
      user: req.session.user});
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
  }
};

const loadAdminDashboard = async (req, res) => {
  try {
    return res.render("admin/dashboard",{title: "Dashboard",
      layout: "layouts/adminLayout"});
  } catch (error) {
    console.log("home page not found");
    res.status(500).send("server error while loading Home page");
  }
};

module.exports = {
  loadHomepage,
  loadAdminDashboard,
};
