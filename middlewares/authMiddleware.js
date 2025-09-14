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
      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      } else {
        return res.redirect("/admin/login");
      }
    }

    if (!req.session.user.isAdmin) {
      if (req.xhr || req.headers.accept.indexOf("json") > -1) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      } else {
        return res.redirect("/login");
      }
    }

    next();
  } catch (err) {
    console.log("Error in adminAuth:", err);
    res.status(500).send("Internal server error");
  }
};

module.exports = {
  userAuth,
  adminAuth,
  isLogin,
};
