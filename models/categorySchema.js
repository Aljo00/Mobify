const mongoose = require("mongoose");
const {Schema} = mongoose

const categorySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    categoryOffer: {
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
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", categorySchema)

module.exports = Category