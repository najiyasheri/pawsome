const User = require("../models/User");
const Address = require("../models/Address");
const bcrypt = require("bcrypt");

const loadProfile = async (req, res) => {
  try {
    const id = req.session.user._id;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).send("user not found");
    }

    const defaultAddress = await Address.findOne({ userId: id, default: true });
      const { success, error } = req.query;
    return res.render("user/profile", {
      title: "profile",
      layout: "layouts/userLayout",
      user,
      defaultAddress,
      success,
      error,
    });
  } catch (error) {
    console.error("error while loading profile page", error.message);
    res.status(500).send("Server Error");
  }
};

const postProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;
    const id = req.session.user._id;
    const user = await User.findById(id);

    if (!user)
      return res.redirect(
        "/profile?error=" + encodeURIComponent("User not found")
      );

    user.name = name || user.name;
    user.email = email || user.email;

    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
         return res.redirect(
           "/profile?error=" +
             encodeURIComponent("Please fill all password fields")
         );
      }
      if (!currentPassword || !user.password) {
        return res.redirect(
          "/profile?error=" +
            encodeURIComponent("Please fill correct password")
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
       if (!isMatch) {
         return res.redirect(
           "/profile?error=" +
             encodeURIComponent("Current password is incorrect")
         );
       }

       if(newPassword===currentPassword){
        return res.redirect(
          "/profile?error=" +
            encodeURIComponent("old password and current password shouldn't be same")
        );
       }

      if (newPassword !== confirmPassword)
        return res.redirect(
          "/profile?error=" +
            encodeURIComponent("New and confirm password do not match")
        );
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    await user.save();
    req.session.user = user;
    res.redirect("/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Server Error");
  }
};

module.exports = { loadProfile, postProfile };
