const Cart=require('../models/cart')
const Address=require('../models/address')

const loadPayment=async(req,res)=>{
    try {
 
        const userId=req.session.user._id

        const cart=await Cart.findOne({userId}).populate("items.productId")
            let subtotal = 0;
            if (cart && cart.items.length > 0) {
            cart.items.forEach((item) => {
                 console.log("Item:", item);
                const price = Number(item.priceAtAdding) || 0;
                const qty = Number(item.quantity) || 0;
                console.log("Cart items:", cart?.items);
              subtotal += price * qty;
            });
        }
            
    const deliveryCharge = 60;
    const total = subtotal + deliveryCharge;

    let address = await Address.findOne({ userId, isDefault: true });
    if (!address) {
      address= await Address.findOne({ userId });
    }

        res.render("user/payment", {
          title: "payment",
          layout: "layouts/userLayout",
          cart,
          subtotal,
          deliveryCharge,
          total,
          address
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
}

module.exports = { loadPayment };