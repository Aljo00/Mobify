const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const load_wishlist = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const brand = await Brand.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    let cartItemCount = 0;
    let userData = null;
    let usercart = null;

    // Fetch user details from the database
    if (userId) {
      usercart = await cart.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });

      cartItemCount = usercart ? usercart.items.length : 0;
      userData = await User.findById(userId);
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

    const userWishlist = await Wishlist.findOne({ userId }).populate(
      "items.ProductId"
    );

    // Add product image and name to each wishlist item
    if (userWishlist && userWishlist.items.length > 0) {
      userWishlist.items = userWishlist.items.map((item) => {
        item.image = item.ProductId.productImage[0];
        item.name = item.ProductId.productName;
        return item;
      });
    }

    console.log(userWishlist.items);

    res.render("user/wishlist", {
      wishlist: userWishlist,
      user: userData,
      brand,
      category,
      cartItemCount,
    });
  } catch (error) {
    console.log("Error loading wishlist:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while loading the wishlist",
    });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const productId = req.query.id;
    const product = await Product.findById(productId);

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const selectedCombo = product.combos[0];

    let userWishlist = await Wishlist.findOne({ userId });

    if (!userWishlist) {
      userWishlist = new Wishlist({ userId, items: [] });
    }

    if (userWishlist.items.length >= 10) {
      return res.json({
        success: false,
        message: "You can add a maximum of 10 items to the wishlist",
      });
    }

    const itemIndex = userWishlist.items.findIndex(
      (item) =>
        item.ProductId.toString() === productId &&
        item.RAM === selectedCombo.ram &&
        item.Storage === selectedCombo.storage &&
        item.color === selectedCombo.color[0]
    );

    if (itemIndex > -1) {
      return res.json({
        success: false,
        message: "Product already in wishlist",
      });
    } else {
      userWishlist.items.push({
        ProductId: productId,
        RAM: selectedCombo.ram,
        Storage: selectedCombo.storage,
        color: selectedCombo.color[0],
        price: selectedCombo.salePrice,
      });
    }

    await userWishlist.save();

    res.json({
      success: true,
      message: "Product successfully added to wishlist",
    });
  } catch (error) {
    console.log("Error adding to wishlist:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while adding to wishlist",
      });
  }
};

module.exports = {
  load_wishlist,
  addToWishlist,
};
