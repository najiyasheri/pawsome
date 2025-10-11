const { default: mongoose } = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const OrderItem = require("../models/OrderItem");

const loadOrder = async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 2; 

    const matchStage = {};

    if (search) {
      matchStage.orderId = { $regex: search, $options: "i" };
    }

    const totalOrdersAgg = await Order.aggregate([
      { $match: matchStage },
      { $count: "total" },
    ]);

    const totalOrders = totalOrdersAgg[0]?.total || 0;
    const totalPages = Math.ceil(totalOrders / limit);

   
    const orders = await Order.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, email: 1, phone: 1 } }],
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "orderId",
          as: "items",
          pipeline: [
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product",
                pipeline: [{ $project: { name: 1, price: 1, images: 1 } }],
              },
            },
            { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                quantity: 1,
                price: 1,
                "product.name": 1,
                "product.price": 1,
                "product.images": 1,
              },
            },
          ],
        },
      },
    ]);

    console.log(orders);
   
    res.render("admin/orderManagement", {
      title: "Order-Management",
      layout: "layouts/adminLayout",
      orders,
      search,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};


const loadOrderDetail = async (req, res) => {
  try {
    const orderId = req.params.id;

    // Fetch order with embedded items and populated user info
    const order = await Order.findById(orderId).populate(
      "userId",
      "name email phone"
    );

    if (!order) return res.status(404).send("Order not found");

    // Items are already embedded, no need to fetch from OrderItem
    // If you want, you can also calculate subtotal for each item
    const itemsWithSubtotal = order.items.map((item) => ({
      ...item.toObject(),
      subtotal: item.price * item.quantity,
    }));

    const fullOrder = {
      ...order.toObject(),
      items: itemsWithSubtotal,
    };

    res.render("admin/orderDetail", {
      title: "Order Details",
      layout: "layouts/adminLayout",
      order: fullOrder,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};


const cancelSingleItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    item.status = "Cancelled";
    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling item");
  }
};



const cancelEntireOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

  
    order.items = order.items.map(item => ({
      ...item.toObject(),
      status: "Cancelled"
    }));

    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error cancelling order");
  }
};


const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");

    // Find embedded item
    const item = order.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).send("Item not found");

    item.status = status;
    await order.save();

    res.redirect(`/admin/order/${orderId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating status");
  }
};



const loadUserOrders = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orders = await Order.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "orderId",
          as: "items",
          pipeline: [
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product",
              },
            },
           
          ],
        },
      },
    ]);

 console.log(orders)

    res.render("user/myOrder", {
      title: "MyOrders",
      layout: "layouts/userLayout",
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

module.exports = {
  loadOrder,
  loadOrderDetail,
  cancelSingleItem,
  cancelEntireOrder,
  updateOrderStatus,
  loadUserOrders,
};
