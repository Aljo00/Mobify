const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const { razarpay } = require("../../config/razarPay");
const env = require("dotenv").config();
const { v4: uuidv4 } = require("uuid");

// Process the checkout page
const processCheckout = async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = userId ? await User.findById(userId) : null;

    // Fetch the required data
    const brand = await Brand.find({});
    const addresses = await Address.find({ userId });
    const cart = await Cart.findOne({ userId }).populate("items.ProductId");

    // Filter out items with zero quantity
    const validCartItems = cart.items.filter((item) => item.quantity > 0);

    // Calculate the cart item count
    const cartItemCount = validCartItems.filter(
      (item) => !item.outOfStock
    ).length;

    const totalPrice = validCartItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    for (const item of validCartItems) {
      if (item.ProductId.stock < item.quantity) {
        return res.status(400).render("user/cart", {
          message: `The product ${item.ProductId.name} is out of stock or has insufficient quantity.`,
        });
      }
    }
    // Calculate the cart summary
    const cartSummary = {
      totalItems: cartItemCount,
      totalPrice: validCartItems.reduce(
        (acc, item) => acc + item.totalPrice,
        0
      ),
    };

    console.log("Valid Cart Items:", validCartItems);

    // Pass data to the view
    res.render("user/checkOut", {
      addresses,
      cart: { items: validCartItems },
      brand,
      cartItemCount,
      cartSummary,
      user: userData,
      totalPrice: totalPrice,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Place the order
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

    // Filter out items with zero quantity for the order
    const validCartItems = cart.items.filter((item) => item.quantity > 0);

    if (validCartItems.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid items in cart" });
    }

    const orderItems = validCartItems.map((item) => ({
      product: item.ProductId._id,
      productName: item.ProductId.productName, // Add product name
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      RAM: item.RAM,
      Storage: item.Storage,
      color: item.color,
      status: "Pending",
    }));

    console.log(orderItems);

    const totalAmount = validCartItems.reduce(
      (acc, item) => acc + item.totalPrice,
      0
    );

    if (paymentMethod === "wallet") {
      // Call walletPayment and handle the error if any
      const errorMessage = await walletPayment(totalAmount, req.user.id);

      if (errorMessage) {
        // If an error message is returned, send the response
        return res.status(400).json({ success: false, message: errorMessage });
      }
    }

    // Create the order with UUID
    const newOrder = new Order({
      orderId: uuidv4(), // Add this line to generate UUID
      userId,
      address: selectedAddress,
      paymentMethod,
      orderedItems: orderItems,
      totalPrice: totalAmount,
      FinalAmount: totalAmount,
      status: "Pending",
    });

    await newOrder.save();

    // Update the product quantities in the Product collection
    for (const item of validCartItems) {
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

    // Remove only the valid items from the cart after placing the order
    cart.items = cart.items.filter((item) => item.quantity === 0);
    await cart.save();

    console.log(newOrder);

    res.json({
      success: true,
      message: "Order placed successfully",
      redirectUrl: `/order-success?id=${newOrder.orderId}`, // Use orderId instead of _id
    });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const walletPayment = async (totalAmount, userId) => {
  try {
    // Find the wallet by user ID
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return "Wallet not found";
    }

    // Check for sufficient balance
    if (wallet.balance < totalAmount) {
      return "Insufficient balance";
    }

    // Deduct the amount and update transactions
    wallet.balance -= totalAmount;
    wallet.transactions.push({
      type: "debit",
      amount: totalAmount,
      date: new Date(), // Save the current date and time
      description: "Order placed",
    });

    // Save the wallet
    await wallet.save();
    console.log("Wallet balance updated successfully");

    // Return null to indicate success
    return null;
  } catch (error) {
    console.error("Error placing order:", error);

    // Return a generic error message
    return "Internal server error";
  }
};

const razarPay = async (re, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    const options = {
      amount: amount * 100,
      currency: currency,
    };

    const order = await razarpay.orders.create(options);
    res
      .status(200)
      .json({ success: true, message: "Razarpay completed", order });
  } catch (error) {
    console.error("Error placing order:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const orderSuccess = async (req, res) => {
  try {
    const user = req.user.id;
    const orderId = req.query.id;
    console.log("Order ID:", orderId);

    const order = await Order.findOne({ orderId: orderId })
      .populate({
        path: 'orderedItems.product',
        select: 'productName images price' // Select the fields you need
      })
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const userAddress = await Address.findOne({ userId: user }).lean();
    if (userAddress) {
      const selectedAddress = userAddress.address.find(
        (addr) => addr._id.toString() === order.address.toString()
      );
      
      if (selectedAddress) {
        order.formattedAddress = {
          type: selectedAddress.addressType,
          name: selectedAddress.houseName,
          landmark: selectedAddress.landMark,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          alternatePhone: selectedAddress.altPhone
        };
      }
    }

    // Format the ordered items for display
    order.formattedItems = order.orderedItems.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.price,
      totalPrice: item.totalPrice,
      specifications: {
        RAM: item.RAM,
        Storage: item.Storage,
        color: item.color
      }
    }));

    console.log("Formatted order:", order);
    res.render("user/orderSuccesful", { order });
  } catch (error) {
    console.error("Error rendering order success page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


module.exports = {
  processCheckout,
  placeOrder,
  razarPay,
  orderSuccess,
};
