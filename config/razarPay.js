const Razorpay = require("razorpay");
const env = require("dotenv").config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZARPAY_API_KEY_ID,
  key_secret: process.env.RAZARPAY_API_SECRET_KEY,
});

module.exports = { razorpay }