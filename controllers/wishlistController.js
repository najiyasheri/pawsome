const Wishlist=require('../models/Wishlist')
const Product=require('../models/Product')

const viewWishlist = async (req, res) => {
  const userId = req.session.user._id;
  const wishlist = await Wishlist.findOne({ userId })
    .populate("products")
    .lean();
console.log('gjhbnfmlv')
  res.render("user/wishlist", {
    title: "My Wishlist",
    layout:'Layouts/userLayout',
    products: wishlist ? wishlist.products : [],
  });
};
 const addToWishlist = async (req, res) => {
  const userId = req.session.user._id;
  const productId = req.params.productId;

  let wishlist = await Wishlist.findOne({ userId });
  if (!wishlist) wishlist = new Wishlist({ userId, products: [productId] });
  else if (!wishlist.products.includes(productId))
    wishlist.products.push(productId);

  await wishlist.save();
  res.redirect("back"); 
};

 const removeFromWishlist = async (req, res) => {
  await Wishlist.updateOne(
    { userId: req.session.user._id },
    { $pull: { products: req.params.productId } }
  );
  res.redirect("back");
};


module.exports = {
  viewWishlist,
  addToWishlist,
  removeFromWishlist,
};