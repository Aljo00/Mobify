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
        const { productName, brand, description, category, combos } = req.body;

        // Handle image upload and resizing
        const imagePaths = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                const imagePath = req.files[i].filename;
                imagePaths.push(imagePath);
            }
        }

        if (combos) {
            console.log("Combos Data:", combos); // Log the original combos
            
            // Parse combos first
            const combosArray = JSON.parse(combos); // Parse combos safely

            // Iterate over the parsed combos
            combosArray.forEach((combo) => {
                if (combo.color && typeof combo.color === "string") {
                    combo.color = combo.color.split(",").map((color) => color.trim());
                }
            });

            // Check if the product already exists
            const existingProduct = await Product.findOne({ productName });
            if (existingProduct) {
                return res.status(400).json({ error: "Product already exists" });
            }

            // Save the new product
            const newProduct = new Product({
                productName,
                description,
                brand,
                category,
                combos: combosArray, // Combos array that includes RAM, Storage, Prices, etc.
                productImage: imagePaths,
                status: "Available",
            });

            await newProduct.save();
            res.redirect("/admin/addProducts");
        } else {
            res.status(400).json({ error: "Combos data is required" });
        }
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
            isBlocked: false, 
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
            isBlocked: false, 
            $or:[
                {productName:{$regex: new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}}
            ]
        }).countDocuments();

        // Add comboCount for each product document
        productData.forEach(product => {
            product.comboCount = product.combos ? product.combos.length : 0; // Add combo count
        });       

        const category = await Category.find({isListed: true});
        const brand = await Brand.find({isBlocked: false});
        const totalPages = Math.ceil(count / limit);  

        if(category && brand){
            res.render("admin/product",{
                data: productData,
                products: JSON.stringify(productData),
                currentPage: page,
                totalPages: totalPages,
                cat: category,
                brand: brand    
            })
        }
        
    } catch (error) {
        console.log("Error found in Product Management side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const softDeleteProduct = async (req, res) => {
    try {
        const id = req.params.id;

        // Update the category's `isListed` status to false
        const updateProduct = await Product.findByIdAndUpdate(id, { isBlocked: true }, { new: true });

        if (updateProduct) {
            res.status(200).json({ message: "Product soft deleted successfully." });
        } else {
            res.status(400).json({ error: "Product not found." });
        }
    } catch (error) {
        console.log("Error in soft deleting Product: ", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
};

const getEditProduct = async (req,res) => {
    
    try {

        const id = req.query.id;
        const product = await Product.findById(id);
        const category= await Category.find({});
        const brand = await Brand.find({});
        res.render("admin/editProduct",{
            product: product,
            cat: category,
            brand: brand
        })
        
    } catch (error) {
        console.log("Error found in the loading Edit Product side: ", error.message);
        res.redirect("/admin/error");
    }

}

const editProduct = async (req,res) => {

    try {

        const id = req.params.id;
        const product = await Product.findOne({_id:id});
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id:{$ne:id}
        });

        if(existingProduct){
            return res.status(400).json({error:"Product with this name is already exists!. Please try again with another name"})
        }

        const images = [];

        if(req.files && req.files.length > 0){
            for(let i = 0; i < req.files.length; i++){
                images.push(req.files[i].filename);
            }
        }

        const combosArray = req.body.combos;

        const updateFields = {
            productName: data.productName,
            description: data.description,
            brand: data.brand,
            category: data.category,
            combos: combosArray
        }

        if(req.files.length > 0){
            updateFields.$push = {productImage: {$each:images}};
        }

        await Product.findByIdAndUpdate(id,updateFields,{new: true});
        console.log("Products editted successfully completed")
        res.redirect("/admin/products");
        
    } catch (error) {
        console.log("Error found in Edit Product side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const deleteSingleImage = async (req,res) => {

    try {

        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","re-image",imageNameToServer);
        if (fs.existsSync(imagePath)) {
            await fs.unlinkSync(imagePath);
            console.log(`image ${imageNameToServer} deleted successfully`);
        }else{
            console.log(`image ${imageNameToServer} not found`);
        }

        res.send({status:true});
        
    } catch (error) {
        console.log("Error found in deletion of image in Edit Product side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

module.exports = {
    loadProductAddPage,
    addProducts,
    getAllProducts,
    softDeleteProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}