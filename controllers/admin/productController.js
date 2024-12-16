const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");



const loadProductAddPage = async (req,res) => {

    try {

        const brand = await Brand.find();
        const category = await Category.find({isListed:true})
        res.render("admin/addProduct",{
            cat: category,
            brand: brand
        })
        
    } catch (error) {
        console.log("Error found in Product Management side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const addProducts = async (req, res) => {
    console.log(req.body);
    try {
        
        const {  productName, brand, description, category, combos } = req.body;

        // Handle image upload and resizing
        const imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = req.files[i].filename;
                imagePaths.push(imagePath);
            }
        }

        if (combos) {
            console.log("Combos Data:", combos);  // Log the combos data
            const parsedCombos = JSON.parse(combos);  // Parse combos if it's a stringified JSON
            console.log("Parsed Combos:", parsedCombos);  // Log parsed combos
        }

        // Check if the product already exists
        const existingProduct = await Product.findOne({ productName });
        if (existingProduct) {
            return res.status(400).json({ error: "Product already exists" });
        }

        const combosArray = JSON.parse(combos);

        // Save the new product
        const newProduct = new Product({
            productName,
            description,
            brand,
            category,
            combos: combosArray, // Combos array that includes RAM, Storage, Prices, etc.
            productImage: imagePaths,
            status: "Available"
        });

        await newProduct.save();
        res.redirect("/admin/addProducts");

    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Internal server error");
    }
};

const getAllProducts = async (req,res) => {

    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;
        const skip = (page-1)*limit;

        const productData = await Product.find({
            $or:[
                {productName:{$regex: new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}}
            ]
        })
        .limit(limit)
        .skip(skip)
        .populate('category')
        .exec()

        const count = await Product.find({
            $or:[
                {productName:{$regex: new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}}
            ]
        }).countDocuments()
        
    } catch (error) {
        console.log("Error found in Product Management side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

module.exports = {
    loadProductAddPage,
    addProducts,
    getAllProducts
}