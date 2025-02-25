const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const env = require("dotenv").config();

const loadCartPage = async (req, res) => {
  try {
    const brandData = await Brand.find({isBlocked:false}).lean();
    const userId = req.user.id;
    const userCart = await cart
      .findOne({ userId })
      .populate({
        path: "items.ProductId", // Populate ProductId
        select: "productName productImage combos", // Select combos as well
      })
      .lean();

    const userData = userId ? await User.findById(userId) : null;

    // Validate cart quantities against product quantities in the database
    let insufficientQuantityItems = [];
    for (const item of userCart.items) {
      const product = await Product.findById(item.ProductId);
      const selectedCombo = product.combos.find(
        (combo) =>
          combo.ram === item.RAM &&
          combo.storage === item.Storage &&
          combo.color.includes(item.color)
      );

      if (selectedCombo.quantity === 0) {
        item.outOfStock = true;
        item.totalPrice = selectedCombo.quantity * selectedCombo.salePrice;
        item.quantity = selectedCombo.quantity;
      } else if (item.quantity > selectedCombo.quantity) {
        insufficientQuantityItems.push({
          productName: product.productName,
          availableQuantity: selectedCombo.quantity,
        });
        // Update the quantity in the cart
        item.quantity = selectedCombo.quantity;
        item.totalPrice = selectedCombo.quantity * selectedCombo.salePrice;
      }
       
    }
    // Save the updated cart
    await cart.updateOne({ userId }, { items: userCart.items });

    // Calculate cart item count excluding out-of-stock items
    const cartItemCount = userCart.items.filter(item => !item.outOfStock).length;

    console.log("Cart page rendered of the user:", userData.name);
    res.render("user/cart", {
      cart: userCart,
      brand: brandData,
      user: userData,
      cartItemCount,
      insufficientQuantityItems,
    });
  } catch (error) {
    console.error("Error loading cart page:", error);
    res.status(500).send("Internal server error");
  }
};


const addtoCart = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const { id } = req.params; // Product ID
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

    if (parsedQuantity > 5) {
      return res
        .status(400)
        .json({ success: false, message: "You can add a maximum of 5 items" });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    // Fetch product details
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Find the selected combo
    const selectedCombo = product.combos.find(
      (combo) =>
        combo.ram === ram &&
        combo.storage === storage &&
        combo.color.includes(color)
    );

    if (!selectedCombo) {
      return res.status(400).json({
        success: false,
        message: "The selected configuration is not available",
      });
    }

    // Validate stock availability
    const totalPrice = parsedQuantity * selectedCombo.salePrice;
    let userCart = await cart.findOne({ userId });

    if (!userCart) {
      userCart = new cart({ userId, items: [] });
    }

    if (userCart.items.length >= 5) {
      return res.json({
        success: false,
        message: "You can add a maximum of 5 items",
      });
    }

    const itemIndex = userCart.items.findIndex(
      (item) =>
        item.ProductId.toString() === id &&
        item.RAM === ram &&
        item.Storage === storage &&
        item.color === color
    );

    let currentCartQuantity = 0;

    if (itemIndex > -1) {
      currentCartQuantity = userCart.items[itemIndex].quantity;
    }

    const totalRequestedQuantity = currentCartQuantity + parsedQuantity;

    if (totalRequestedQuantity > selectedCombo.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${selectedCombo.quantity} items are available in stock`,
      });
    }

    if (totalRequestedQuantity > 10) {
      return res.status(400).json({
        success: false,
        message: "You cannot add more than 10 items of the same product combo",
      });
    }

    // Update cart item or add new one
    if (itemIndex > -1) {
      userCart.items[itemIndex].quantity = totalRequestedQuantity;
      userCart.items[itemIndex].totalPrice =
        totalRequestedQuantity * selectedCombo.salePrice;
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

const addToCartFromHome = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }

    const id = req.query.id;

    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    const selectedCombo = product.combos[0];
    const quantity = 1;

    const totalPrice = selectedCombo.salePrice * quantity;

    let userCart = await cart.findOne({ userId });

    if (!userCart) {
      userCart = new cart({ userId, items: [] });
    }

    if (userCart.items.length >= 10) {
      return res.json({
        success: false,
        message: "You can add a maximum of 10 items",
      });
    }

    const itemIndex = userCart.items.findIndex(
      (item) =>
        item.ProductId.toString() === id &&
        item.RAM === selectedCombo.ram &&
        item.Storage === selectedCombo.storage &&
        item.color === selectedCombo.color[0]
    );

    let currentCartQuantity = 0;

    if (itemIndex > -1) {
      currentCartQuantity = userCart.items[itemIndex].quantity;
    }

    const totalRequestedQuantity = currentCartQuantity + quantity;

    if (totalRequestedQuantity > 5) {
      return res.status(400).json({
        success: false,
        message: "You cannot add more than 5 same items",
      });
    }

    if (totalRequestedQuantity > selectedCombo.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${selectedCombo.quantity} items are available in stock`,
      });
    }

    if (itemIndex > -1) {
      userCart.items[itemIndex].quantity = totalRequestedQuantity;
      userCart.items[itemIndex].totalPrice =
        totalRequestedQuantity * selectedCombo.salePrice;
    } else {
      userCart.items.push({
        ProductId: id,
        quantity: quantity,
        RAM: selectedCombo.ram,
        Storage: selectedCombo.storage,
        color: selectedCombo.color[0],
        price: selectedCombo.salePrice,
        totalPrice: totalPrice,
      });
    }

    await userCart.save();

    req.session.cartItemCount = userCart.items.reduce(
      (acc, item) => acc + item.quantity,
      0
    );

    res.json({ success: true, message: "Product successfully added" });
  } catch (error) {
    console.log("Error adding to cart from home:", error.message);
    res.redirect("/page404");
  }
};

const updateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let { id, quantity, ram, storage, color, price } = req.body;

    price = parseFloat(price.replace("₹", "").trim());
    console.log(price);
    if (!id || !ram || !storage || !color || !quantity || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Missing product details" });
    }

    const parsedQuantity = parseInt(quantity);
    console.log(parsedQuantity);
    const parsedPrice = parseFloat(price);

    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid quantity" });
    }

    if (parsedQuantity > 5) {
      return res
        .status(400)
        .json({ success: false, message: "You can add a maximum of 5 items" });
    }

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }

    // Fetch product details
    const product = await Product.findById(id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Find the selected combo
    const selectedCombo = product.combos.find(
      (combo) =>
        combo.ram === ram &&
        combo.storage === storage &&
        combo.color.includes(color)
    );

    if (!selectedCombo) {
      return res.status(400).json({
        success: false,
        message: "The selected configuration is not available",
      });
    }

    // Validate stock availability
    const totalPrice = parsedQuantity * selectedCombo.salePrice;
    let userCart = await cart.findOne({ userId });

    if (!userCart) {
      userCart = new cart({ userId, items: [] });
    }

    if (userCart.items.length >= 10) {
      return res.json({
        success: false,
        message: "You can add a maximum of 10 items",
      });
    }

    const itemIndex = userCart.items.findIndex(
      (item) =>
        item.ProductId.toString() === id &&
        item.RAM === ram &&
        item.Storage === storage &&
        item.color === color
    );

    const totalRequestedQuantity = parsedQuantity;

    if (totalRequestedQuantity > selectedCombo.quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${selectedCombo.quantity} items are available in stock`,
      });
    }

    if (totalRequestedQuantity > 10) {
      return res.status(400).json({
        success: false,
        message: "You cannot add more than 10 items of the same product combo",
      });
    }

    // Update cart item or add new one
    if (itemIndex > -1) {
      userCart.items[itemIndex].quantity = totalRequestedQuantity;
      userCart.items[itemIndex].totalPrice =
        totalRequestedQuantity * selectedCombo.salePrice;
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

    return res.status(200).json({
      success: true,
      message: "Cart updated successfully",
      totalItems: userCart.items.reduce((sum, item) => sum + item.quantity, 0), // Total items in cart
      totalPrice: userCart.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      ), // Total price of cart
      itemTotalPrice: totalPrice, // Total price of the updated item
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the cart",
    });
  }
};

const deleteFromCart = async (req, res) => {
  try {
    const user = req.user;
    const userId = user.id;
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
  addToCartFromHome,
  loadCartPage,
  updateCart,
  deleteFromCart,
};
