const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // Ensure one wallet per user
  },
  balance: {
    type: Number,
    default: 0, // Initial wallet balance
    min: 0, // Prevent negative balances
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ["credit", "debit"], // Type of transaction
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0, // Transaction amount must be positive
      },
      date: {
        type: Date,
        default: Date.now, // Transaction date
      },
      description: {
        type: String, // Optional description for the transaction
      },
    },
  ],
});

module.exports = mongoose.model("Wallet", walletSchema);
