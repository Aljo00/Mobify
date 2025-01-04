const mongoose = require("mongoose");
const Product = require("./productSchema");
const {Schema} = mongoose

const cartSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        ProductId: {
            type:Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity:{
            type: Number,
            default: 1
        },
        RAM:{
            type: String,
            required: true
        },
        Storage:{
            type: String,
            required: true
        },
        color:{
            type: String,
            required: true
        },
        price: {
            type:Number,
            required: true
        },
        totalPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            default: 'Placed'
        },
        cancellationReason: {
            type: String,
            default: "None"
        }
    }]

})

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart