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

        return res.status(200).json({
          success: true,
          message: "Razorpay order created",
          order: razorpayOrder,
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
          message: "Failed to create Razorpay order",
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

orderSuccess = async (req, res) => {
  try {
    const orderId = req.query.id;
    console.log("Order ID:", orderId);

    // Update populate to include specific address fields
    const order = await Order.findOne({ orderId: orderId }).populate({
      path: "address",
      select: "street city state zip", // specify the fields you want to populate
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }
    console.log("Order with address:", order);
    res.render("user/orderSuccesful", { order });
  } catch (error) {
    console.error("Error rendering order success page:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Add new function to verify Razorpay payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      cartDetails,
    } = req.body;

    // Verify the payment signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac(
      "sha256",
      process.env.RAZARPAY_API_SECRET_KEY
    );
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === razorpay_signature) {
      let couponId = null;
      if (cartDetails.appliedCoupon) {
        const coupon = await Coupon.findOne({ name: cartDetails.appliedCoupon });
        if (coupon) {
          couponId = coupon._id;
        }
      }

      const newOrder = new Order({
        orderId: uuidv4(),
        userId: req.user.id,
        address: cartDetails.address,
        paymentMethod: "razorpay",
        orderedItems: cartDetails.items,
        totalPrice: cartDetails.totalAmount,
        discount: cartDetails.discount || 0,
        FinalAmount: cartDetails.finalAmount,
        couponApplied: cartDetails.couponApplied || false,
        appliedCouponCode: cartDetails.appliedCoupon,
        couponId: couponId,  // Save the coupon ID
        status: "Processing",
        paymentDetails: {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
        },
      });

      await newOrder.save();

      // Update product quantities
      for (const item of cartDetails.items) {
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

      // Clear cart
      const cart = await Cart.findOne({ userId: req.user.id });
      if (cart) {
        cart.items = [];
        await cart.save();
      }

      res.json({
        success: true,
        message: "Payment verified and order placed successfully",
        redirectUrl: `/order-success?id=${newOrder.orderId}`,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during payment verification",
    });
  }
};

module.exports = {
  processCheckout,
  placeOrder,
  razarPay,
  orderSuccess,
  verifyRazorpayPayment, // Add this to exports
};
