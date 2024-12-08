const { name } = require("ejs");
const mongoose = require("mongoose");
const {Schema} = mongoose;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
<<<<<<< HEAD
        default: null,
        sparse:true
    },
    googleId: {
        type: String,
        unique: true,
=======
        default: null
    },
    googleId: {
        type: String,
>>>>>>> 2995d72858372e5c4d1a9e4014a1d58a7e94bcdc
        sparse: true
    },
    password: {
        type: String,
        required: false,
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart:[{
        type: Schema.Types.ObjectId,
        ref: "Cart"
    }],
    wallet: {
        type: Number,
        default: 0
    },
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    createdOn: {
        type: Date,
        default: Date.now
    },
    referralCode: {
        type: String
    },
    redeemed: {
        type: Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }],
    searchHistory: [{
        category:{
            type:Schema.Types.ObjectId,
            ref: "Category"
        },
        brand:{
            type: String
        },
        searchOn:{
            type: Date,
            default: Date.now
        }
    }]

})

const User = mongoose.model("User", userSchema);

module.exports = User;