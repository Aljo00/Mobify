const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true, 
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true,
  },
  expireOn: {
    type: Date,
    required: true, 
  },
  offerPrice: {
    type: Number,
    required: true, 
  },
  minimumPrice: {
    type: Number,
    required: true, 
  },
  maxUses: {
    type: Number,
    default: 1, 
  },
  usesCount: {
    type: Number,
    default: 0, 
  },
  maxUsesPerUser: {
    type: Number,
    default: 1, 
  },
  isListed: {
    type: Boolean,
    default: true, 
  },
  isDeleted: {
    type: Boolean,
    default: false, 
  },
});

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;