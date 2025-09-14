const User = require("../models/User");

const loadUserManagement = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = parseInt(req.query.page) || 1;
    const limit = 5;

    const filter = {
      isAdmin: false,
      $or: [
        { name: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    };

    const userData = await User.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(filter);

    const totalPages = Math.ceil(count / limit);

    res.render("admin/userManagement", {
      title: "User-Management",
      userData,
      currentPage: page,
      totalPages,
      limit,
      layout: "layouts/adminLayout",
      search,
    });
  } catch (error) {
    console.log("Pagination error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const toggleBlock = async (req, res) => {
  try {
    let id = req.query.id;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' }); 
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ success: true, _id: user._id, isBlocked: user.isBlocked });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, error: 'Failed to toggle block status' });
  }
};



module.exports = {
  loadUserManagement,
  toggleBlock
};
