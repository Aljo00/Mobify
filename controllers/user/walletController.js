const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema");

const mongoose = require("mongoose");

const load_wallet = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const brand = await Brand.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });
    let cartItemCount = 0;
    let userData = null;
    let usercart = null;
    let walletData = null;

    // Fetch user details from the database
    if (userId) {
      usercart = await cart.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });

      cartItemCount = usercart ? usercart.items.length : 0;
      userData = await User.findById(userId);
      walletData = await Wallet.findOne({ user: userId });

      if (!userData.profileImage) {
        const name = userData.name || "";
        userData.initials = name
          .replace(/\s+/g, "") // Remove all spaces in the name
          .slice(0, 2) // Take the first two characters
          .toUpperCase(); // Convert to uppercase
      }
    } else {
      console.log("User not logged in or session not set.");
    }

    res.render("user/wallet", {
      brand,
      category,
      cartItemCount,
      user: userData,
      wallet: walletData || { balance: 0, transactions: [] },
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

module.exports = {
  load_wallet,
};