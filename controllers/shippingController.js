const Address = require("../models/Address");
const loadShipping = async (req, res) => {
  try {
    const getFutureDate = (daysAhead) => {
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      const options = { day: "numeric", month: "short", year: "numeric" };
      return date.toLocaleDateString("en-GB", options);
    };
    const shippingOptions = [
      { type: "Regular", price: 50, daysAhead: 6, value: "Regular" },
      { type: "Express", price: 120, daysAhead: 4, value: "Express" },
    ];
    shippingOptions.forEach((opt) => (opt.date = getFutureDate(opt.daysAhead)));
    const address = await Address.findById(req.query.addressId);
    console.log("addrss", address);
    if (!address) {
      res.render("user/address", { error: "please enter address" });
    }
    req.session.addressId = address._id;
    res.render("user/shipping", {
      layout: "layouts/userLayout",
      title: "shipping",
      shippingOptions,
      selectedShipping: req.session.shipping || "regular",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
};

const saveShipping = (req, res) => {
  try {
    const { shipping } = req.body;
    req.session.shipping = shipping;
    res.redirect("/payment");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

module.exports = { loadShipping, saveShipping };
