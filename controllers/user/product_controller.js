const User = require('../../models/userSchema');
const Brand = require('../../models/brandSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { response } = require('../../app');
const env = require("dotenv").config();


const getProductDetails = async (req, res) => {
    try {
        const productId = req.query.id;

        if (!productId) {
            return res.redirect('/error'); // Handle invalid product ID
        }

        // Fetch the main product
        const product = await Product.findById(productId)
            .populate('category')
            .populate('combos')
            .exec();

        if (!product) {
            return res.redirect('/error'); // Handle product not found
        }

        // Fetch related products based on the category (excluding the current product)
        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: product._id },
            isBlocked: false,
            combos: { $elemMatch: { quantity: { $gt: 0 } } }
        })
            .limit(4)
            .exec();

        const brand = await Brand.find({}).limit(7);

        return res.render('user/product', {
            product: product,
            relatedProducts: relatedProducts,
            brand:brand
        });
    } catch (error) {
        console.error('Error fetching product details:', error.message);
        res.redirect('/error');
    }
};

const loadProductDetails = async (req, res) => {
    try {
        const productId = req.params.id; // Extract product ID from the URL
        console.log("Product ID:", productId);
        const { ram, storage, color } = req.query; // Extract combo parameters from query

        // Fetch the main product by ID
        const product = await Product.findById(productId).lean();

        if (!product) {
            return res.status(404).send("Product not found");
        }

        // If specific combo options are provided, find the matching combo
        let selectedCombo = null;
        if (ram && storage && color) {
            selectedCombo = product.combos.find(
                (combo) => combo.ram === ram && combo.storage === storage && combo.color === color
            );
        } else {
            // Default to the first combo
            selectedCombo = product.combos[0];
        }

        // Fetch related products (e.g., products from the same category or brand)
        const relatedProducts = await Product.find({
            category: product.category, // Assuming a `category` field exists
            _id: { $ne: productId }, // Exclude the current product
        })
            .limit(4) // Limit to 4 related products
            .lean();

        const brand = await Brand.find({}).limit(7);

        // Pass the data to the view
        return res.render("user/product", {
            product,
            selectedCombo, // Pass selected combo to the view
            ram,
            storage,
            color,
            brand,
            relatedProducts, // Pass related products to the view
        });
    } catch (error) {
        console.log("Error in loading product details:", error.message);
        res.status(500).send("Server error");
    }
};

module.exports = {
    getProductDetails,
    loadProductDetails
}