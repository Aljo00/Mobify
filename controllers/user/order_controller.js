const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();

const processCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = userId ? await User.findById(userId) : null;

    // Fetch the required data
    const brand = await Brand.find({});
    const addresses = await Address.find({ userId });
    const cart = await Cart.findOne({ userId }).populate("items.ProductId");

    // Calculate the cart item count
    const cartItemCount = cart
      ? cart.items.reduce((acc, item) => acc + item.quantity, 0)
      : 0;

    // Calculate the cart summary
    const cartSummary = {
      totalItems: cartItemCount,
      totalPrice: cart
        ? cart.items.reduce((acc, item) => acc + item.totalPrice, 0)
        : 0,
    };

    // Pass data to the view
    res.render("user/checkOut", {
      addresses,
      cart,
      brand,
      cartItemCount,
      cartSummary,
      user: userData,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  processCheckout,
};