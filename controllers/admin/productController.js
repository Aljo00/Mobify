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

const addProducts = async (req,res) => {

    try {

        console.log(req.body)
        const products = req.body;
        const productExists = await Product.findOne({
            productName:products.productName
        });

        console.log(productExists)

        if(!productExists){
            const images = [];
            if(req.files && req.files.length > 0){
                for (let i = 0; i < req.files.length; i++) {
                    const orginalImagePath = req.files[i].path;

                    const reSizedImagesPath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(orginalImagePath).resize({width:440,height:440}).toFile(reSizedImagesPath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name:products.category});

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdAt: new Date(),
                quantity:products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status:"Available"
            });

            await newProduct.save()
            console.log("Product Added successfully")

            return res.redirect("/admin/addProducts")

        }else{
            res.status(400).json("Product is already Exists, Please try with another name")
        }
        
    } catch (error) {
        console.log("Error found in Product Management side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const getAllProducts = async (req,res) => {

    try {

        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        
        
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