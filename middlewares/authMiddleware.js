const User = require("../models/User");
const userAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user._id);

    if (user && !user.isBlocked) {
      return next();
    }
    return res.redirect("/login");
  } catch (error) {
    console.log("error in user auth middleware:", error);
    res.status(500).send("internal server error");
  }
};

const isLogin = (req, res, next) => {
  if (req.session.user) {
    if (req.session.user.isAdmin) {
      return res.redirect("/admin/dashboard");
    }
    return res.redirect("/");
  }
  next();
};

const adminAuth = async (req, res, next) => {
  try {
    if (!req.session.user) {
      if (req.xhr) {
        return res.status(401).json({ 
          success: false, 
          error: 'Not authenticated. Please log in.', 
          redirect: '/admin/login' 
        });
      }
      return res.redirect("/admin/login");
    }

    if (!req.session.user.isAdmin) {
      if (req.xhr) {
        return res.status(403).json({ 
          success: false, 
          error: 'Not authorized. You must be an admin.', 
          redirect: '/login' 
        });
      }
      return res.redirect("/login");
    }

    next();
  } catch (err) {
    console.log("Error in adminAuth:", err);
    if (req.xhr) {
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  userAuth,
  adminAuth,
  isLogin,
};
