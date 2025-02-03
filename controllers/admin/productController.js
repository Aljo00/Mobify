const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const cloudinary = require("../../config/cloudinary");

const loadProductAddPage = async (req, res) => {
  try {
    const brand = await Brand.find();
    const category = await Category.find({ isListed: true });
    res.render("admin/addProduct", {
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.log("Error found in Product Management side: ", error.message);
    res.redirect("/admin/error");
  }
};

const addProducts = async (req, res) => {
  console.log(req.body);
  try {
    const { productName, brand, description, category, combos } = req.body;

    const imagePaths = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const result = await cloudinary.uploader.upload(req.files[i].path, {
          quailty: "100",
        });

        imagePaths.push(result.secure_url);
      }
    }

    if (combos) {
      // Parse combos first
      const combosArray = JSON.parse(combos);

      combosArray.forEach((combo) => {
        if (combo.color && typeof combo.color === "string") {
          combo.color = combo.color.split(",").map((color) => color.trim());
        }
      });

      // Check if the product already exists
      const existingProduct = await Product.findOne({ productName });
      if (existingProduct) {
        console.log("Product already exists");
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
      console.log("Product added successfully");
      return res.status(200).json({ message: "Product added successfully" });
    } else {
      console.log("Combos data is required");
      return res.status(400).json({ error: "Combos data is required" });
    }
  } catch (error) {
    console.error("Error adding product:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    const productData = await Product.find({
      isBlocked: false,
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("category")
      .exec();

    const count = await Product.find({
      isBlocked: false,
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    // Add comboCount for each product document
    productData.forEach((product) => {
      product.comboCount = product.combos ? product.combos.length : 0;
    });

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    const totalPages = Math.ceil(count / limit);

    if (category && brand) {
      res.render("admin/product", {
        data: productData,
        products: JSON.stringify(productData),
        currentPage: page,
        totalPages: totalPages,
        cat: category,
        brand: brand,
      });
    }
  } catch (error) {
    console.log("Error found in Product Management side: ", error.message);
    res.redirect("/admin/error");
  }
};

const softDeleteProduct = async (req, res) => {
  try {
    const id = req.params.id;

    // Update the product's "isBlocked" field to true
    const updateProduct = await Product.findByIdAndUpdate(
      id,
      { isBlocked: true },
      { new: true }
    );

    if (updateProduct) {
      res.status(200).json({ message: "Product soft deleted successfully." });
    } else {
      res.status(400).json({ error: "Product not found." });
    }
  } catch (error) {
    console.error("Error in soft deleting Product: ", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findById(id);
    const category = await Category.find({});
    const brand = await Brand.find({});
    res.render("admin/editProduct", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.log(
      "Error found in the loading Edit Product side: ",
      error.message
    );
    res.redirect("/admin/error");
  }
};

const editProduct = async (req, res) => {
  try {
    console.log('⭐ Edit Product Request Started');
    const id = req.params.id;
    const data = req.body;
    
    console.log('📦 Request Data:', {
      id,
      productName: data.productName,
      brand: data.brand,
      category: data.category,
      filesReceived: req.files?.length || 0
    });

    // Validate product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      console.log('❌ Product not found:', id);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Parse and validate combos
    let combosArray;
    try {
      combosArray = typeof data.combos === 'string' ? JSON.parse(data.combos) : data.combos;
      console.log('🎯 Parsed Combos:', combosArray);
    } catch (error) {
      console.error('❌ Combo parsing error:', error);
      return res.status(400).json({ error: 'Invalid combo data format' });
    }

    // Handle image uploads
    let newImages = [];
    if (req.files && req.files.length > 0) {
      console.log('📸 Processing', req.files.length, 'new images');
      for (const file of req.files) {
        try {
          const result = await cloudinary.uploader.upload(file.path);
          newImages.push(result.secure_url);
        } catch (error) {
          console.error('❌ Image upload error:', error);
        }
      }
      console.log('✅ Uploaded images:', newImages);
    }

    // Prepare update data
    const updateData = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      combos: combosArray
    };

    // Only update images if new ones were uploaded
    if (newImages.length > 0) {
      updateData.productImage = [...(existingProduct.productImage || []), ...newImages];
    }

    console.log('📝 Update Data:', updateData);

    // Perform update
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('✅ Product Updated Successfully:', updatedProduct._id);
    
    return res.status(200).json({
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('❌ Edit Product Error:', error);
    return res.status(500).json({
      error: 'Failed to update product: ' + error.message
    });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imagePublicId, productIdToServer } = req.body;

    if (!imagePublicId || !productIdToServer) {
      return res.status(400).json({
        status: false,
        message: "Missing required parameters",
      });
    }

    // Find the product first to verify it exists
    const product = await Product.findById(productIdToServer);
    if (!product) {
      return res.status(404).json({
        status: false,
        message: "Product not found",
      });
    }

    // Check if the image exists in the product's images
    if (!product.productImage.includes(imagePublicId)) {
      return res.status(404).json({
        status: false,
        message: "Image not found in product",
      });
    }

    // Remove the image URL from the product's productImage array
    const updatedProduct = await Product.findByIdAndUpdate(
      productIdToServer,
      {
        $pull: { productImage: imagePublicId },
      },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(500).json({
        status: false,
        message: "Failed to update product",
      });
    }

    res.json({
      status: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    res.status(500).json({
      status: false,
      message: "An error occurred while deleting the image",
      error: error.message,
    });
  }
};

const loadComboDetails = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).select("combos");
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ combos: product.combos });
  } catch (error) {
    console.error("Error fetching product combos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const addOffer = async (req, res) => {
  try {
    const { productId, offerPercentage } = req.body;

    if (offerPercentage < 0 || offerPercentage > 100) {
      return res.status(400).json({ error: "Invalid offer percentage" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.offer = offerPercentage;

    // Update salePrice for each combo
    product.combos.forEach((combo) => {
      combo.salePrice = Math.round(
        combo.salePrice - combo.salePrice * (offerPercentage / 100)
      );
    });

    await product.save();
    res.json({ message: "Offer added successfully" });
  } catch (error) {
    console.error("Error fetching product combos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const removeOffer = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.offer === 0) {
      return res.status(400).json({ message: "No offer to remove" });
    }

    const currentOffer = product.offer;

    product.combos.forEach((combo) => {
      combo.salePrice = Math.round(combo.salePrice / (1 - currentOffer / 100));
    });

    product.offer = 0;

    await product.save();

    res.status(200).json({ message: "Offer removed successfully" });
  } catch (error) {
    console.error("Error fetching product combos:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  loadProductAddPage,
  addProducts,
  getAllProducts,
  softDeleteProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  loadComboDetails,
  addOffer,
  removeOffer,
};
