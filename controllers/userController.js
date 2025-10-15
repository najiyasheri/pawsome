const { default: mongoose } = require("mongoose");
const Address = require("../models/Address");
const Order = require("../models/Order");
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

    if (req.query.blocked === "true") {
      filter.isBlocked = true;
    }
    if (req.query.active === "true") {
      filter.isBlocked = false;
    }
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
      return res.status(404).json({ success: false, error: "User not found" });
    }
    user.isBlocked = !user.isBlocked;
    await user.save();
    res.json({ success: true, _id: user._id, isBlocked: user.isBlocked });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, error: "Failed to toggle block status" });
  }
};

const viewUserDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    const defaultAddress = await Address.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      default: true,
    }).lean();

    const recentOrders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();
    res.render("admin/viewUser", {
      user,
      title: "viewUser",
      layout: "layouts/adminLayout",
      recentOrders,
      defaultAddress,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ success: false, error: "error while fetching data" });
  }
};

module.exports = {
  loadUserManagement,
  toggleBlock,
  viewUserDetails,
};
