const mongoose = require("mongoose");
const {Schema} = mongoose;

const productSchema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    combos: [
      {
        ram: {
          type: String,
          required: true,
        },
        storage: {
          type: String,
          required: true,
        },
        regularPrice: {
          type: Number,
          required: true,
        },
        salePrice: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        color: {
          type: [String],
          required: true,
        },
        status: {
          type: String,
          enum: ["Available", "Out of Stock", "Discontinued"],
          required: true,
          default: "Available",
        },
      },
    ],
    offer: {
      type: Number,
      default: 0,
    },
    offerStartDate: {
      type: Date, // Start date of the offer
      default: null,
    },
    offerEndDate: {
      type: Date, // End date of the offer
      default: null,
    },
    productImage: {
      type: [String],
      required: true,
    },
    reviews: [
      {
        userName: {
          type: String,
          required: true,
        },
        rating: {
          type: Number,
          required: true,
        },
        comment: {
          type: String,
          required: true,
        },
      },
    ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product