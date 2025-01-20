const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const cart = require("../../models/cartSchema");
const Wallet = require("../../models/walletSchema");
const { razorpay } = require("../../config/razarPay");
const crypto = require("crypto");

const mongoose = require("mongoose");

const load_wallet = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;

    const brand = await Brand.find({ isBlocked: false });
    const category = await Category.find({ isListed: true });
    let cartItemCount = 0;
    let userData = null;
    let usercart = null;
    let walletData = null;

    // Fetch user details from the database
    if (userId) {
      usercart = await cart.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });

      cartItemCount = usercart ? usercart.items.length : 0;
      userData = await User.findById(userId);
      walletData = await Wallet.findOne({ user: userId });

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

    res.render("user/wallet", {
      brand,
      category,
      cartItemCount,
      user: userData,
      wallet: walletData || { balance: 0, transactions: [] },
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

const addMoneyToWallet = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    console.log(order);

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
    } = req.body;

    const user = req.user;
    const userId = user.id;

    // Generate signature using Razorpay's algorithm
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZARPAY_API_SECRET_KEY)
      .update(body.toString())
      .digest("hex");

    // Compare signatures
    if (expectedSignature !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    // Payment is verified, update wallet balance
    let wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({
        user: userId,
        balance: amount,
        transactions: [
          {
            type: "credit",
            amount: amount,
            date: new Date(), // Save the current date and time
            description: "Money added to wallet",
          },
        ],
      });
    } else {
      // Update balance
      wallet.balance += amount;
      wallet.transactions.push({
        type: "credit",
        amount: amount,
        date: new Date(), // Save the current date and time
        description: "Money added to wallet",
      });
      await wallet.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment verified and wallet updated",
      wallet,
    });
  } catch (error) {
    console.error("Error verifying payment:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  load_wallet,
  addMoneyToWallet,
  verifyPayment
};
