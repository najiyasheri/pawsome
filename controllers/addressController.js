const Address = require("../models/Address");
  const Cart = require("../models/Cart");

const loadAddress = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("You must be logged in to view the address");
    }

    const userId = req.session.user._id;
    req.session.inCheckout = true;

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.variantId",
      populate: { path: "productId" },
    });

    if (!cart || cart.items.length === 0) {
      return res.redirect(
        "/cart?msg=" + encodeURIComponent("Your cart is empty.")
      );
    }

    const outOfStockItems = [];
    const blockedItems = [];

    for (const item of cart.items) {
      const variant = item.variantId;
      const product = variant?.productId;

      if (!variant || !product) continue;

      if (variant.stock < item.quantity) {
        outOfStockItems.push({
          productName: product.name || "Unknown product",
          variantName: variant.variantName,
          available: variant.stock,
          requested: item.quantity,
        });
      }

      if (product.isBlocked) {
        blockedItems.push(product.name || "Unknown product");
      }
    }

    if (outOfStockItems.length > 0) {

      return res.redirect(
        "/cart?msg=" +
          encodeURIComponent(
            `Some items are out of stock or quantity exceeded`
          )
      );
    }

    if (blockedItems.length > 0) {
      const message = blockedItems.join(", ");
      return res.redirect(
        "/cart?msg=" +
          encodeURIComponent(
            `Some products are currently unavailable for purchase`
          )
      );
    }

    const addresses = await Address.find({ userId });

    res.render("user/checkoutAddress", {
      title: "Address",
      layout: "layouts/userLayout",
      user: req.session.user,
      addresses,
    });
  } catch (error) {
    console.error("Error while loading address page:", error);
    res.status(500).send("Server Error");
  }
};



const addAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const { name, phone, type, address ,pinCode} = req.body;
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
      pinCode,
      default: isDefault || false,
    });

    await newAddress.save();

    res.redirect("/address");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const editAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const address = await Address.findById(id);
    if (!address) return res.status(404).send("Address not found");
    res.render("user/editAddress", {
      address,
      user: "req.session.user",
      title: "address",
      layout: "layouts/userLayout",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

const postEdit = async (req, res) => {
  try {
    const { name, phone, type, address,pinCode,default: isDefault } = req.body;
    const userId = req.session.user._id;
    if (isDefault) {
      await Address.updateMany(
        { userId, _id: { $ne: req.params.id } },
        { $set: { default: false } }
      );
    }
    await Address.findByIdAndUpdate(req.params.id, {
      name,
      phone,
      type,
      address,
      pinCode,
      default: !!isDefault,
    });
    res.redirect("/myAddress");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

const deleteAddress = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).send("You must be logged in");
    }
    const userId = req.session.user._id;
    const addressId = req.params.id;

    const deleted = await Address.findOneAndDelete({
      _id: addressId,
      userId: userId,
    });

    if (!deleted) {
      return res.status(404).send("Address not found");
    }
    res.redirect("/myAddress");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const loadMyAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const addresses = await Address.find({ userId });

    res.render("user/myAddress", {
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

const addMyAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const { name, phone, type, address ,pinCode } = req.body;
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
      pinCode,
      default: isDefault || false,
    });

    await newAddress.save();

    res.redirect("/myAddress");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = {
  loadAddress,
  addAddress,
  editAddress,
  postEdit,
  deleteAddress,
  loadMyAddress,
  addMyAddress,
};
