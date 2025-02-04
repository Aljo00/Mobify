const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema"); // Add this line

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({ isListed: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments({ isListed: true });
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.log("Error found in categoryManagement side: ", error.message);
    res.redirect("/admin/error");
  }
};

const addCategory = async (req, res) => {
  let { name, description } = req.body;

  try {
    // Trim spaces from the category name
    name = name.trim();

    // Check if the category already exists (case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists.." });
    }

    // Create a new category
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();

    return res.status(200).json({ message: "Category added successfully" });
  } catch (error) {
    console.log("Error found in Adding category side: ", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    res.render("admin/editCategory", { category: category });
  } catch (error) {
    console.log("Error found in categoryManagement side: ", error.message);
    res.redirect("/admin/error");
  }
};

const editCategory = async (req, res) => {
  try {
    id = req.params.id;
    const { name, description } = req.body;

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: name,
        description: description,
      },
      { new: true }
    );

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(400).json({ error: "Category Not found" });
    }
  } catch (error) {
    console.log("Error found in categoryManagement side: ", error.message);
    res.redirect("/admin/error");
  }
};

const softDeleteCategory = async (req, res) => {
  try {
    const id = req.params.id;

    // Update the category's `isListed` status to false
    const updateCategory = await Category.findByIdAndUpdate(
      id,
      { isListed: false },
      { new: true }
    );

    if (updateCategory) {
      res.status(200).json({ message: "Category soft deleted successfully." });
    } else {
      res.status(400).json({ error: "Category not found." });
    }
  } catch (error) {
    console.log("Error in soft deleting category: ", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
};

const addOffer = async (req, res) => {
  try {
    console.log(req.body);
    const { categoryId, offerPercentage, offerStartDate, offerEndDate } =
      req.body;

    const startDate = new Date(offerStartDate);
    const endDate = new Date(offerEndDate);
    if (!startDate || !endDate || startDate >= endDate) {
      return res.status(400).json({ message: "Invalid start or end date" });
    }

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.categoryOffer = offerPercentage;
    category.offerStartDate = startDate;
    category.offerEndDate = endDate;
    await category.save();

    const products = await Product.find({ category: category.name });
    products.forEach(async (product) => {
      product.combos.forEach((combo) => {
        combo.salePrice = Math.round(
          combo.salePrice - combo.salePrice * (offerPercentage / 100)
        );
      });
      await product.save();
    });

    res
      .status(200)
      .json({ message: "Category offer added successfully", category });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const removeOffer = async (req, res) => {
  try {
    const { categoryId } = req.body;

    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const currentOffer = category.categoryOffer;
    if (currentOffer === 0) {
      return res.status(400).json({ message: "No active offer to remove" });
    }

    // Reset category offer
    category.categoryOffer = 0;
    category.offerStartDate = null;
    category.offerEndDate = null;
    await category.save();

    // Reset sale prices for all products under the category
    const products = await Product.find({ category: category.name });
    products.forEach(async (product) => {
      product.combos.forEach((combo) => {
        combo.salePrice = Math.round(
          combo.salePrice / (1 - currentOffer / 100)
        );
      });
      await product.save();
    });

    res
      .status(200)
      .json({ message: "Category offer removed successfully", category });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

const getTopCategories = async (req, res) => {
  try {

    // First get active categories
    const categories = await Category.find({ 
      isListed: true 
    }).lean();

    console.log(`Found ${categories.length} active categories`);

    // Get completed orders with product details
    const orders = await Order.aggregate([
      {
        $match: {
          'orderedItems.status': 'Delivered'
        }
      },
      {
        $unwind: '$orderedItems'
      },
      {
        $match: {
          'orderedItems.status': 'Delivered'
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'orderedItems.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: '$productInfo'
      },
      {
        $group: {
          _id: '$productInfo.category',
          totalSold: { $sum: '$orderedItems.quantity' },
          totalRevenue: { $sum: '$orderedItems.totalPrice' }
        }
      }
    ]);

    // Map the sales data to categories
    const categoriesWithStats = categories.map(category => {
      const salesData = orders.find(order => order._id === category.name) || {
        totalSold: 0,
        totalRevenue: 0
      };

      return {
        name: category.name,
        totalSold: salesData.totalSold,
        totalRevenue: salesData.totalRevenue,
        currentOffer: category.categoryOffer || 0,
        description: category.description
      };
    });

    // Sort and get top 5
    const topCategories = categoriesWithStats
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Calculate percentages
    const maxRevenue = Math.max(...topCategories.map(c => c.totalRevenue)) || 1;
    const formattedCategories = topCategories.map(category => ({
      ...category,
      percentage: Math.round((category.totalRevenue / maxRevenue) * 100) || 0
    }));

    console.log('Successfully processed top categories');

    return res.status(200).json({
      categories: formattedCategories
    });

  } catch (error) {
    console.error('Error in getTopCategories:', error);
    return res.status(500).json({
      error: 'Failed to fetch top categories',
      details: error.message
    });
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  getEditCategory,
  editCategory,
  softDeleteCategory,
  addOffer,
  removeOffer,
  getTopCategories,
};
