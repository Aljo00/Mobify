const mongoose = require("mongoose");
const { schema } = require("./userSchema");
const {Schema} = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    products: [{
        productsId: {
            type: schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    }]

})

const Wishlist = mongoose.model("Wishlist",wishlistSchema);

module.exports = Wishlist