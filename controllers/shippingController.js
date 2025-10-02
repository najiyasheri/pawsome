const Address=require('../models/address')
const loadShipping = async (req, res) => {
  try {
    const getFutureDate = (daysAhead) => {
      const date = new Date();
      date.setDate(date.getDate() + daysAhead);
      const options = { day: "numeric", month: "short", year: "numeric" };
      return date.toLocaleDateString("en-GB", options);
    };
    const shippingOptions = [
      { type: "Regular", price: 50, daysAhead: 6, value: "regular" },
      { type: "Express", price: 120, daysAhead: 4, value: "express" },
    ];
    shippingOptions.forEach((opt) => (opt.date = getFutureDate(opt.daysAhead)));
    const addresses = await Address.find({ userId: req.session.user._id});
  

    res.render("user/shipping", {
      layout: "layouts/userLayout",
      title: "shipping",
      shippingOptions,
      addresses,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Something went wrong");
  }
};

module.exports = { loadShipping };
