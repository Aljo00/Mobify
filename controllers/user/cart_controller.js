const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();

const addtoCart = async (req, res) => {
  try {
    const userId = req.session.user;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    console.log(req.query);

    const { id } = req.params;
    const { ram, storage, color, quantity, price } = req.query;

    if (!id || !ram || !storage || !color || !quantity || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Missing product details" });
    }

    const parsedQuantity = parseInt(quantity);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    const totalPrice = parsedQuantity * parsedPrice;

    let userCart = await cart.findOne({ userId });

    if (!userCart) {
      userCart = new cart({ userId, items: [] });
    }

    const itemIndex = userCart.items.findIndex(
      (item) =>
        item.ProductId.toString() === id &&
        item.RAM === ram &&
        item.Storage === storage &&
        item.color === color
    );

    if (itemIndex > -1) {
      userCart.items[itemIndex].quantity += parsedQuantity;
      userCart.items[itemIndex].totalPrice += totalPrice;
    } else {
      userCart.items.push({
        ProductId: id,
        quantity: parsedQuantity,
        RAM: ram,
        Storage: storage,
        color: color,
        price: parsedPrice,
        totalPrice: totalPrice,
      });
    }

    await userCart.save();

    req.session.cartItemCount = userCart.items.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.json({ success: true, message: "Product successfully added" });
    } else {
      res.redirect("/cart");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    } else {
      res.status(500).send("Internal server error");
    }
  }
};

const loadCartPage = async (req, res) => {
  try {
    const brandData = await Brand.find({}).lean();
    const userId = req.session.user;
    const userCart = await cart
      .findOne({ userId })
      .populate({
        path: "items.ProductId", // Populate ProductId
        select: "productName productImage", // Select only the required fields
      })
      .lean();

    console.log("Populated Cart:", userCart);

    const user = req.session.user;
    const userData = user ? await User.findById(user) : null;

    res.render("user/cart", {
      cart: userCart,
      brand: brandData,
      user: userData,
    });
  } catch (error) {
    console.error("Error loading cart page:", error);
    res.status(500).send("Internal server error");
  }
};

const deleteFromCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.id;

    console.log("Product ID to delete:", productId);

    let userCart = await cart.findOne({ userId });

    if (!userCart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const itemIndex = userCart.items.findIndex(
      (item) => item.ProductId._id.toString() === productId
    );

    if (itemIndex > -1) {
      userCart.items.splice(itemIndex, 1);
      await userCart.save();

      req.session.cartItemCount = userCart.items.reduce(
        (acc, item) => acc + item.quantity,
        0
      );

      res.redirect("/cart");
    } else {
      res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }
  } catch (error) {
    console.error("Error deleting from cart:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  addtoCart,
  loadCartPage,
  deleteFromCart,
};
