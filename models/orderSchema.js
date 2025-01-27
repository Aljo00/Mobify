const mongoose = require("mongoose");
const { Schema } = mongoose;

const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      default: () => uuidv4(),
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderedItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: false,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        RAM: {
          type: String,
          required: true,
        },
        Storage: {
          type: String,
          required: true,
        },
        color: {
          type: String,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          required: true,
          enum: [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered",
            "Cancelled",
            "Return Request",
            "Returned",
          ],
        },
      },
    ],
    totalPrice: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    FinalAmount: {
      type: Number,
      required: true,
    },
    address: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    invoiceDate: {
      type: Date,
    },
    couponApplied: {
      type: Boolean,
      default: false,
    },
    appliedCouponCode: {
      type: String,
      default: null,
    },
    couponId: {
      // Add this field
      type: Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    paymentDetails: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
