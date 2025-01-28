const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Address = require("../../models/addressSchema");
const Wallet = require("../../models/walletSchema");
const { razorpay } = require("../../config/razarPay");
const env = require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const Coupon = require("../../models/couponSchema"); // Add this import

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
    const { selectedAddress, paymentMethod, appliedCoupon } = req.body;

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
    let finalAmount = totalAmount;
    let discount = 0;
    let couponApplied = false;

    // Apply coupon if present
    if (appliedCoupon) {
      const coupon = await Coupon.findOne({ name: appliedCoupon });
      if (coupon && totalAmount >= coupon.minimumPrice) {
        discount = coupon.offerPrice;
        finalAmount = totalAmount - discount;
        couponApplied = true;

        // Create order with coupon details
        const newOrder = new Order({
          // ...existing order fields...
          totalPrice: totalAmount,
          discount: discount,
          FinalAmount: finalAmount,
          couponApplied: couponApplied,
          appliedCouponCode: appliedCoupon,
          couponId: coupon._id,  // Save the coupon ID
          status: "Pending",
        });

        // Update coupon usage
        coupon.usesCount += 1;
        await coupon.save();
      }
    }

    if (paymentMethod === "wallet") {
      // Call walletPayment and handle the error if any
      const errorMessage = await walletPayment(finalAmount, req.user.id);

      if (errorMessage) {
        // If an error message is returned, send the response
        return res.status(400).json({ success: false, message: errorMessage });
      }
    } else if (paymentMethod === "razorpay") {
      try {
        const options = {
          amount: finalAmount * 100, // Use finalAmount instead of totalAmount
          currency: "INR",
          receipt: `order_${Date.now()}`,
        };

        const razorpayOrder = await razorpay.orders.create(options);

        const orderId = uuidv4();
        console.log("Generated orderId:", orderId); // Debug log

        // Create initial order with Payment Pending status
        const newOrder = new Order({
          orderId: orderId, // Explicitly set orderId
          userId,
          address: selectedAddress,
          paymentMethod,
          orderedItems: orderItems.map(item => ({
            ...item,
            status: "Payment Pending" // Set status for each ordered item
          })),
          totalPrice: totalAmount,
          discount: discount,
          FinalAmount: finalAmount,
          couponApplied: couponApplied,
          appliedCouponCode: appliedCoupon,
          status: "Payment Pending",
          paymentDetails: {
            razorpay_order_id: razorpayOrder.id
          }
        });

        const savedOrder = await newOrder.save();
        console.log("Saved order:", savedOrder); // Debug log

        // Clear cart after order creation
        cart.items = [];
        await cart.save();

        return res.status(200).json({
          success: true,
          message: "Razorpay order created",
          order: razorpayOrder,
          orderId: orderId, // Send the same orderId
          cartDetails: {
            items: orderItems,
            totalAmount: totalAmount,
            finalAmount: finalAmount,
            discount: discount,
            couponApplied: couponApplied,
            appliedCoupon: appliedCoupon,
            address: selectedAddress,
          },
        });
      } catch (error) {
        console.error("Razorpay order creation error:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to create Razorpay order: " + error.message
        });
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
      discount: discount,
      FinalAmount: finalAmount,
      couponApplied: couponApplied,
      appliedCouponCode: appliedCoupon, // Add this field to orderSchema if not exists
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

    const order = await razorpay.orders.create(options);
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
    const orderId = req.query.id;
    console.log("Looking for order with ID:", orderId);

    // Find the order and populate address
    const order = await Order.findOne({ orderId })
      .populate('address')
      .exec();

    console.log("Raw order from DB:", order); // Debug log

    if (!order) {
      console.log("Order not found for ID:", orderId);
      return res.redirect('/orders');
    }

    // Extract address data safely
    const formattedAddress = order.address ? {
      type: order.address.addressType || 'N/A',
      name: order.address.houseName || 'N/A',
      city: order.address.city || 'N/A',
      state: order.address.state || 'N/A',
      pincode: order.address.pincode || 'N/A',
      phone: order.address.phone || 'N/A',
      alternatePhone: order.address.altPhone || 'N/A'
    } : null;

    // Format ordered items safely
    const formattedItems = order.orderedItems ? order.orderedItems.map(item => ({
      name: item.productName || 'N/A',
      specifications: {
        RAM: item.RAM || 'N/A',
        Storage: item.Storage || 'N/A',
        color: item.color || 'N/A'
      },
      quantity: item.quantity || 0,
      totalPrice: item.totalPrice || 0
    })) : [];

    // Create view model with all required data
    const orderData = {
      orderId: order.orderId,
      status: order.status,
      totalPrice: order.totalPrice,
      createdAt: order.createdAt,
      formattedAddress,
      formattedItems,
      paymentMethod: order.paymentMethod,
      FinalAmount: order.FinalAmount,
      discount: order.discount
    };

    console.log("Formatted order data:", orderData); // Debug log

    return res.render("user/orderSuccesful", { 
      order: orderData,
      title: "Order Success"
    });
  } catch (error) {
    console.error("Error in orderSuccess:", error);
    return res.redirect('/orders');
  }
};

// Add new function to verify Razorpay payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderId
    } = req.body;

    console.log("Verifying payment for order:", orderId);

    const order = await Order.findOne({ 
      orderId: orderId
    });

    if (!order) {
      return res.redirect('/orders');
    }

    // Verify signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", process.env.RAZARPAY_API_SECRET_KEY);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      // Payment successful
      order.status = "Processing";
      order.paymentDetails = {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
      };

      // Update ordered items status
      order.orderedItems = order.orderedItems.map(item => ({
        ...item,
        status: "Processing"
      }));

      // Now update product quantities
      for (const item of order.orderedItems) {
        const product = await Product.findById(item.product);
        if (product) {
          const comboIndex = product.combos.findIndex(
            (combo) =>
              combo.ram === item.RAM &&
              combo.storage === item.Storage &&
              combo.color.includes(item.color)
          );

          if (comboIndex !== -1) {
            product.combos[comboIndex].quantity -= item.quantity;
            if (product.combos[comboIndex].quantity === 0) {
              product.combos[comboIndex].status = "Out of Stock";
            }
            await product.save();
          }
        }
      }

      await order.save();

      res.json({
        success: true,
        message: "Payment verified and order placed successfully",
        redirectUrl: `/order-success?id=${order.orderId}` // Correct redirect URL
      });
    } else {
      // Payment failed
      order.status = "Payment Failed";
      await order.save();
      res.json({
        success: false,
        message: "Payment verification failed",
        redirectUrl: `/order-success?id=${order.orderId}` // Change this to order-success as well
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.json({
      success: false,
      message: "Error processing payment",
      redirectUrl: `/order-success?id=${orderId}` // Redirect to order-success even on error
    });
  }
};

// Add method to handle abandoned payments
const handleAbandonedPayment = async (orderId) => {
  try {
    const order = await Order.findOne({ orderId, status: "Payment Pending" });
    if (order) {
      order.status = "Cancelled";
      await order.save();
    }
  } catch (error) {
    console.error("Error handling abandoned payment:", error);
  }
};

module.exports = {
  processCheckout,
  placeOrder,
  razarPay,
  orderSuccess,
  verifyRazorpayPayment,
  handleAbandonedPayment // Add handleAbandonedPayment to exports
};
