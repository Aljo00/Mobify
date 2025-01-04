const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

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
        const originalPath = path.join(
          req.files[i].destination,
          req.files[i].filename
        ); // Original uploaded image
        const resizedPath = path.join(
          req.files[i].destination,
          `resized-${req.files[i].filename}`
        ); // New path for resized image

        // Process image with sharp
        await sharp(originalPath)
          .resize({ width: 800, height: 800 }) // Resize image to 800x800 pixels
          .jpeg({ quality: 100 }) // Adjust quality as needed
          .toFile(resizedPath); // Save resized image to a new file

        imagePaths.push(`resized-${req.files[i].filename}`); // Add resized image path to the array

        // Optionally, delete the original image to save storage space
        // fs.unlinkSync(originalPath);
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
        images.push(req.files[i].filename);
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
    const { imageNameToServer, productIdToServer } = req.body;
    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join(
      "public",
      "uploads",
      "re-image",
      imageNameToServer
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`image ${imageNameToServer} not found`);
    }

    res.send({ status: true });
  } catch (error) {
    console.log(
      "Error found in deletion of image in Edit Product side: ",
      error.message
    );
    res.redirect("/admin/error");
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
