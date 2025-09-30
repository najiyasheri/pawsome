const User = require("../models/User");
const bcrypt = require("bcrypt");


const loadProfile=async(req,res)=>{
 try {

   const id=req.session.user._id
   const user=await User.findById(id)
   if(!user){
      res.status(404).send('user not found')
   }
   return res.render("user/profile", {
      title: "profile",
      layout: "layouts/userLayout",
      user:user
    });

 } catch (error) {
    console.error('error while loading profile page',error.message)
    res.status(500).send("Server Error");
 }
}
const postProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, confirmPassword } =
      req.body;
    const id = req.session.user._id;
    const user = await User.findById(id);

    if (!user) return res.status(400).send("User not found");


    user.name = name || user.name;
    user.email = email || user.email;


    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).send("Please fill all password fields");
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch)
        return res.status(400).send("Current password is incorrect");

      if (newPassword !== confirmPassword)
        return res
          .status(400)
          .send("New password and confirm password do not match");

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
    }

    await user.save();
    req.session.user=user
    res.redirect('/profile');
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Server Error");
  }
};


module.exports=
{loadProfile,
postProfile
}