const User = require('../../models/userSchema');
const Brand = require('../../models/brandSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const { response } = require('../../app');
const env = require("dotenv").config();
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    console.log(req.query);
    const { ram, storage, color } = req.query;

    const product = await Product.findById(productId).lean();

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // if (!product.combos || product.combos.length === 0) {
    //   return res.status(404).send("No combos available for this product");
    // }

    // Match specific combo or default to the first combo
    let selectedCombo = product.combos[0];
    // if (ram && storage && color) {
    //   selectedCombo =
    //     product.combos.find(
    //       (combo) =>
    //         combo.ram === ram &&
    //         combo.storage === storage &&
    //         (Array.isArray(combo.color)
    //           ? combo.color.includes(color)
    //           : combo.color === color)
    //     ) || selectedCombo;
    // }

    // Fetch related products
    const relatedProducts = await Product.find({
      category: product.category, // Match category directly
      _id: { $ne: productId },
    })
      .limit(4)
      .lean();

    const brand = await Brand.find({}).limit(7).lean();

    console.log("this from product page",req.user);
    const userid = req.user?.id || null;
    let userData = null;
    if(userid){
      userData = userid ? await User.findById(userid) : null;
    }

    // Get cart item count from session or calculate it
    let cartItemCount = 0;
    if (userid) {
      const userId = new mongoose.Types.ObjectId(userid);

      const userCart = await cart.findOne({ userId }); // Query with ObjectId

      cartItemCount = userCart ? userCart.items.length : 0; // Calculate count
    } else {
      console.log("User not logged in or session not set."); // Log if user is missing
    }

    // Render the product page
    return res.render("user/product", {
      product,
      user: userData,
      selectedCombo,
      ram,
      storage,
      color,
      brand,
      relatedProducts,
      cartItemCount,
    });
  } catch (error) {
    console.error("Error in loading product details:", error.message);
    res.status(500).send("Server error");
  }
};

const loadComboDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { ram, storage, color } = req.query;


        const product = await Product.findById(id);

        const selectedCombo = product.combos.find(
            (combo) => combo.ram === ram && combo.storage === storage && combo.color.includes(color)
        );

        if (!selectedCombo) {
            return res.status(404).json({ success: false, message: "Combo not found" });
        }

        return res.json({
            success: true,
            combo: {
                salePrice: selectedCombo.salePrice,
                regularPrice: selectedCombo.regularPrice,
                quantity: selectedCombo.quantity,
            },
        });
    } catch (error) {
        console.error("Error loading combo details:", error.message);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {  
    loadProductDetails,
    loadComboDetails
}