const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const env = require("dotenv").config();
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadShopPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const product = await Product.find({});
    const category = await Category.find({});

    const user = req.user;
    console.log(req.user)
    const userId = user.id;
    console.log(userId)
    const usercart = await cart.findOne({ userId: userId });
    cartItemCount = usercart ? usercart.items.length : 0;

    // Fetch user details from the database
    userData = await User.findById(userId);

    // Generate initials if no profile picture exists
    if (!userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name
        .replace(/\s+/g, "") // Remove all spaces in the name
        .slice(0, 2) // Take the first two characters
        .toUpperCase(); // Convert to uppercase
    }

    res.render("user/shop", {
      categories: category,
      products: product,
      brand,
      userData,
      cartItemCount,
      userCart: usercart,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

module.exports = {
  loadShopPage,
};
