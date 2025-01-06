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
          quailty: "100"
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
      .sort({ createdAt: -1 }) // Sort by latest added first
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
    const id = req.params.id;
    const product = await Product.findOne({ _id: id });
    const data = req.body;

    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error:
          "Product with this name already exists! Please try again with another name",
      });
    }

    const images = [];

    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const result = await cloudinary.uploader.upload(req.files[i].path, {
          quailty: "100",
        });

        images.push(result.secure_url);
      }
    }

    // Ensure combos are parsed as an array of objects
    let combosArray = [];
    if (typeof data.combos === "string") {
      combosArray = JSON.parse(data.combos); // Convert the string to an array of objects
    } else if (Array.isArray(data.combos)) {
      combosArray = data.combos; // If it's already an array, no need to parse
    }

    const updateFields = {
      productName: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      combos: combosArray,
    };

    if (req.files.length > 0) {
      updateFields.$push = { productImage: { $each: images } };
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });
    console.log("Product edited successfully!");
    res.status(200).json({ message: "Product edited successfully!" });
  } catch (error) {
    console.log("Error found in Edit Product side: ", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    let { imagePublicId, productIdToServer } = req.body;

    console.log("Original imagePublicId:", imagePublicId);

    // Extract public_id from the URL
    if (imagePublicId.startsWith("http")) {
      const parts = imagePublicId.split("/");
      const fileName = parts[parts.length - 1]; // Extract 'fwnq7d0jqo2cjgg8w4np.png'
      imagePublicId = fileName.split(".")[0]; // Extract 'fwnq7d0jqo2cjgg8w4np'
    }

    console.log("Extracted public_id:", imagePublicId);

    // Step 1: Delete the image from Cloudinary
    const result = await cloudinary.uploader.destroy(imagePublicId);

    if (result.result !== "ok") {
      console.error("Error deleting image from Cloudinary:", result);
      return res.status(500).send({
        status: false,
        message: "Failed to delete image from Cloudinary",
        error: result,
      });
    }

    console.log(`Image ${imagePublicId} deleted from Cloudinary successfully.`);

    // Step 2: Remove image reference from the database
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imagePublicId },
    });

    if (!product) {
      return res
        .status(404)
        .send({ status: false, message: "Product not found" });
    }

    // Step 3: Respond with success
    res.send({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error.message);
    res
      .status(500)
      .send({
        status: false,
        message: "Internal Server Error",
        error: error.message,
      });
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
};
