const Address = require("../models/address");

const loadAddress = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("You must be logged in to view the address");
    }

    const userId = req.session.user._id;

    const addresses = await Address.find({ userId });
    res.render("user/address", {
      title: "address",
      layout: "layouts/userLayout",
      user: req.session.user,
      addresses,
    });
  } catch (error) {
    console.error("error while loading address page", error.message);
    res.status(500).send("Server Error");
  }
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    const { name, phone, type, address } = req.body;
    const isDefault = req.body.default === "on";
    if (isDefault) {
      await Address.updateMany({ userId }, { $set: { default: false } });
    }

    const newAddress = new Address({
      userId,
      name,
      phone,
      type,
      address,
      default: isDefault || false,
    });

    await newAddress.save();

    res.redirect("/address");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};


module.exports = {
  loadAddress,
  addAddress,
};
