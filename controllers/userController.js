const { name } = require("ejs");
const User = require("../models/User");

const loadUserManagement = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = parseInt(req.query.page) || 1
    const limit = 3;

    const filter={
      isAdmin:false,
      $or:[
        {name:{$regex:".*"+search+".*",$options:"i"}},
        {email:{$regex:".*"+search+".*",$options:"i"}}
      ]
    }
    
    const userData = await User.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(filter);

    const totalPages=Math.ceil(count/limit)

    res.render("admin/userManagement",{title:'User-Management',userData,currentPage:page,totalPages,limit,layout: "layouts/adminLayout"});
  } catch (error) 
    {
    console.log("Pagination error:", error);
    res.status(500).send("Internal Server Error");
  }
  
};


const userBlocked=async(req,res)=>{
try{
  let id=req.query.id
  await User.updateOne({_id:id},{$set:{isBlocked:true}})
   res.redirect('/admin/users');
}
catch(error){
  res.redirect('/pageerror')
}

}

const userunBlocked=async(req,res)=>{
  try {
    let id=req.query.id
    await User.updateOne({_id:id},{$set:{isBlocked:false}})
    res.redirect('/admin/users')
  } catch (error) {
    res.redirect('/pageerror')
  }
}

module.exports = {
  loadUserManagement,
  userBlocked,
  userunBlocked
};  