const mongoose = require("mongoose");
const {Schema} = mongoose;

const productSchema = new Schema({
    productName:{
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    combos: [{
        ram: {
            type: String,
            required: true
        },
        storage: {
            type: String,
            required: true
        },
        regularPrice: {
            type: Number,
            required: true
        },
        salePrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        color: {
            type: String,
            required: true
        }
    }],
    offer: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    },
    productImage: {
        type:[String],
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock", "Discontinued"],
        required: true,
        default:"Available"
    }

}, {timestamps: true})

const Product = mongoose.model("Product", productSchema);

module.exports = Product