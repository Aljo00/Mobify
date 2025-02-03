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
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Items per page

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

    let paginatedItems = [];
    let totalPages = 0;
    
    if (userWishlist && userWishlist.items.length > 0) {
      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // Process and paginate items
      const processedItems = userWishlist.items.map(item => ({
        ...item.toObject(),
        image: item.ProductId.productImage[0],
        name: item.ProductId.productName
      }));
      
      paginatedItems = processedItems.slice(startIndex, endIndex);
      totalPages = Math.ceil(processedItems.length / limit);
    }

    res.render("user/wishlist", {
      wishlist: { items: paginatedItems },
      user: userData,
      brand,
      category,
      cartItemCount,
      currentPage: page,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
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

const deleteFromWishlist = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    // Get productId directly from query string
    const productId = req.query.id;
    console.log(`This is the productId:-- ${productId}`);

    if (!productId) {
      return res
        .status(400)
        .json({ success: false, message: "Product ID is required" });
    }

    let userWishlist = await Wishlist.findOne({ userId });

    if (!userWishlist) {
      return res
        .status(404)
        .json({ success: false, message: "Wishlist not found" });
    }

    // Find the product in the wishlist
    const itemIndex = userWishlist.items.findIndex(
      (item) => item.ProductId.toString() === productId
    );

    if (itemIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in wishlist" });
    }

    // Remove the item from the wishlist
    userWishlist.items.splice(itemIndex, 1);
    await userWishlist.save();

    res.json({
      success: true,
      message: "Product successfully removed from wishlist",
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error.message);
    res.status(500).json({
      success: false,
      message: "An error occurred while removing from wishlist",
    });
  }
};  

module.exports = {
  load_wishlist,
  addToWishlist,
  deleteFromWishlist,
};
