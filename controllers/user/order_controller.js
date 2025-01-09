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
    const cartItemCount = cart ? cart.items.length : 0; 

    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    for (const item of cart.items) {
      if (item.ProductId.stock < item.quantity) {
        return res.status(400).render("user/cart", {
          message: `The product ${item.ProductId.name} is out of stock or has insufficient quantity.`,
        });
      }
    }
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
      totalPrice: totalPrice
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { selectedAddress, paymentMethod } = req.body;

    if (!selectedAddress || !paymentMethod) {
      return res
        .status(400)
        .json({ success: false, message: "Missing order details" });
    }

    const cart = await Cart.findOne({ userId }).populate("items.ProductId");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const orderItems = cart.items.map((item) => ({
      product: item.ProductId._id,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      RAM: item.RAM,
      Storage: item.Storage,
      color: item.color,
    }));

    const totalAmount = cart.items.reduce(
      (acc, item) => acc + item.totalPrice,
      0
    );

    // Create the order
    const newOrder = new Order({
      userId,
      address: selectedAddress,
      paymentMethod,
      orderItems: orderItems,
      totalPrice: totalAmount,
      FinalAmount: totalAmount,
      status: "Pending",
    });

    await newOrder.save();

    // Update the product quantities in the Product collection
    for (const item of cart.items) {
      const product = await Product.findById(item.ProductId._id);

      if (product) {
        const comboIndex = product.combos.findIndex(
          (combo) =>
            combo.ram === item.RAM &&
            combo.storage === item.Storage &&
            combo.color.includes(item.color)
        );

        if (comboIndex !== -1) {
          const selectedCombo = product.combos[comboIndex];

          // Check if there is enough stock
          if (selectedCombo.quantity < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for product: ${product.productName}, RAM: ${item.RAM}, Storage: ${item.Storage}`,
            });
          }

          // Reduce the quantity
          product.combos[comboIndex].quantity -= item.quantity;

          // Update the status if the stock is 0
          if (product.combos[comboIndex].quantity === 0) {
            product.combos[comboIndex].status = "Out of Stock";
          }

          await product.save();
        } else {
          return res.status(400).json({
            success: false,
            message: `Invalid combo selection for product: ${product.productName}`,
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: `Product not found for ID: ${item.ProductId._id}`,
        });
      }
    }

    // Clear the cart after placing the order
    await Cart.findOneAndUpdate({ userId }, { items: [] });

    res
      .status(200)
      .json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  processCheckout,
  placeOrder,
};
