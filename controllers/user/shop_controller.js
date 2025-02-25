const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const env = require("dotenv").config();
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");

const loadShopPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });
    const selectedCategory = req.query.category || "";
    const selectedBrand = req.query.brand || "";
    const selectedPriceRange = req.query.priceRange || "";
    const selectedRam = req.query.ram || "";
    const selectedStorage = req.query.storage || "";
    const selectedColor = req.query.color || "";
    const selectedSort = req.query.sort || "";
    const searchQuery = req.query.search || "";

    const productQuery = {};
    if (selectedCategory) {
      productQuery.category = selectedCategory;
    }
    if (selectedBrand) {
      productQuery.brand = selectedBrand;
    }
    if (selectedPriceRange) {
      productQuery["combos.salePrice"] = { $lte: selectedPriceRange };
    }
    if (selectedRam) {
      productQuery["combos.ram"] = parseInt(selectedRam);
    }
    if (selectedStorage) {
      productQuery["combos.storage"] = parseInt(selectedStorage);
    }
    if (selectedColor) {
      productQuery["combos.color"] = { $in: [selectedColor] };
    }
    if (searchQuery) {
      productQuery.productName = { $regex: searchQuery, $options: "i" };
    }

    let product = await Product.find(productQuery);

    if (selectedSort === "priceLowToHigh") {
      product = product.sort(
        (a, b) => a.combos[0].salePrice - b.combos[0].salePrice
      );
    } else if (selectedSort === "priceHighToLow") {
      product = product.sort(
        (a, b) => b.combos[0].salePrice - a.combos[0].salePrice
      );
    } else if (selectedSort === "alphabeticalAZ") {
      product = product.sort((a, b) =>
        a.productName.localeCompare(b.productName)
      );
    } else if (selectedSort === "alphabeticalZA") {
      product = product.sort((a, b) =>
        b.productName.localeCompare(a.productName)
      );
    } else if (selectedSort === "newArrivals") {
      product = product.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    } else if (selectedSort === "oldArrivals") {
      product = product.sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
    }

    const user = req.user;

    let cartItemCount = 0;
    let userData = null;
    let usercart = null;

    // Fetch user details from the database
    if (user) {
      const userId = user.id;

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

    // Fetch unique colors, RAM, and storage from products
    const colors = await Product.distinct("combos.color");
    const rams = await Product.distinct("combos.ram");
    const storages = await Product.distinct("combos.storage");

    res.render("user/shop", {
      categories: category,
      brands: brand,
      products: product,
      brand,
      user: userData,
      cartItemCount,
      userCart: usercart,
      selectedCategory,
      selectedBrand,
      selectedPriceRange,
      selectedRam,
      selectedStorage,
      selectedColor,
      selectedSort,
      searchQuery,
      colors,
      rams,
      storages,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

const searchProducts = async (req, res) => {
  try {
    const brand = await Brand.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });
    const searchQuery = req.query.search || "";

    const productQuery = {
      $or: [
        { productName: { $regex: searchQuery, $options: "i" } },
        { brand: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
        // Update color search to handle array
        {
          combos: {
            $elemMatch: {
              color: {
                $in: [new RegExp(searchQuery, "i")],
              },
            },
          },
        },
      ],
    };

    // Handle numeric searches for RAM and storage
    if (!isNaN(searchQuery)) {
      const numericValue = parseInt(searchQuery);
      productQuery.$or.push(
        { "combos.ram": numericValue },
        { "combos.storage": numericValue }
      );
    }

    let products = await Product.find(productQuery);

    // If no products found, set empty array
    if (!products || products.length === 0) {
      products = [];
      console.log("No products found for search query:", searchQuery);
    }

    const user = req.user;
    let cartItemCount = 0;
    let userData = null;
    let usercart = null;

    if (user) {
      const userId = user.id;
      usercart = await cart.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });
      cartItemCount = usercart ? usercart.items.length : 0;
      userData = await User.findById(userId);
      if (!userData.profileImage) {
        userData.initials = userData.name
          .replace(/\s+/g, "")
          .slice(0, 2)
          .toUpperCase();
      }
    }

    const colors = await Product.distinct("combos.color");
    const rams = await Product.distinct("combos.ram");
    const storages = await Product.distinct("combos.storage");

    res.render("user/shop", {
      categories: category,
      brands: brand,
      products, // This will be empty array if no products found
      brand,
      user: userData,
      cartItemCount,
      userCart: usercart,
      searchQuery,
      colors,
      rams,
      storages,
      selectedCategory: "",
      selectedBrand: "",
      selectedPriceRange: "",
      selectedRam: "",
      selectedStorage: "",
      selectedColor: "",
      selectedSort: "",
      noResults: products.length === 0 // Add this flag to indicate no results
    });

  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

module.exports = {
  loadShopPage,
  searchProducts,
};
