const Brand = require("../../models/brandSchema");
const mongoose = require("mongoose")
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

//This controller is used for rendering Brand page in the admin side.
const loadBrandPage = async (req,res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 2;
        const skip = (page-1)* limit ;

        // Update query to only show unblocked brands
        const brandData = await Brand.find({ isBlocked: false }).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments({ isBlocked: false });
        console.log(`Admin Side :-- Brand Management page rendered succesfully.`)
        console.log(`Total Brands count is ${totalBrands}`)
        console.log("==========");
        const totalPages = Math.ceil(totalBrands/limit);

        res.render("admin/brands",{
            brands:brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        })
        
    } catch (error) {
        console.log(`Admin Side :-- Brand Management page rendering Failed. Because `, error.message)
        console.log("==========");
        res.redirect("/admin/error");
    }
    
}

//This controller add new brands to the database.
const addBrands = async (req, res) => {
    try {
        const brandName = req.body.brand;
        
        // Server-side validation
        if (!brandName || brandName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Brand name must be at least 2 characters long'
            });
        }

        if (!/^[a-zA-Z0-9\s-]+$/.test(brandName)) {
            return res.status(400).json({
                success: false,
                message: 'Brand name can only contain letters, numbers, spaces and hyphens'
            });
        }

        const findBrand = await Brand.findOne({ brandName: { $regex: new RegExp(`^${brandName}$`, 'i') } });
        if (findBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand already exists'
            });
        }

        const image = req.file.filename;
        const newBrand = new Brand({
            brandName: brandName,
            brandImage: image
        });

        await newBrand.save();
        return res.status(200).json({
            success: true,
            message: 'Brand added successfully'
        });

    } catch (error) {
        console.log(`Admin Side :-- Adding New brand Failed. Because ${error.message}`);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getBrandById = async (req, res) => {
    try {
        const brandId = req.params.id;
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(brandId)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid brand ID format' 
            });
        }

        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({ 
                success: false, 
                message: 'Brand not found' 
            });
        }

        res.json({ success: true, brand });
    } catch (error) {
        console.log('Error fetching brand:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching brand details' 
        });
    }
};

const updateBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        const brandName = req.body.brandName;

        // Server-side validation
        if (!brandName || brandName.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Brand name must be at least 2 characters long'
            });
        }

        if (!/^[a-zA-Z0-9\s-]+$/.test(brandName)) {
            return res.status(400).json({
                success: false,
                message: 'Brand name can only contain letters, numbers, spaces and hyphens'
            });
        }

        const existingBrand = await Brand.findOne({
            brandName: { $regex: new RegExp(`^${brandName}$`, 'i') },
            _id: { $ne: brandId }
        });

        if (existingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Brand name already exists'
            });
        }

        const updateData = {
            brandName: brandName
        };

        if (req.file) {
            updateData.brandImage = req.file.filename;
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            brandId,
            updateData,
            { new: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        res.json({
            success: true,
            brand: updatedBrand,
            message: 'Brand updated successfully'
        });

    } catch (error) {
        console.log('Error updating brand:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        // Check if brand is being used in any products before deletion
        // This assumes you have a Product model with a brand reference
        const Product = require('../../models/productSchema');
        const productsUsingBrand = await Product.findOne({ brand: brandId });
        
        if (productsUsingBrand) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete brand as it is being used in products'
            });
        }

        // Soft delete by setting isBlocked to true
        await Brand.findByIdAndUpdate(brandId, { isBlocked: true });

        res.json({
            success: true,
            message: 'Brand deleted successfully'
        });

    } catch (error) {
        console.log('Error deleting brand:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Add restore brand functionality
const restoreBrand = async (req, res) => {
    try {
        const brandId = req.params.id;
        
        const brand = await Brand.findById(brandId);
        if (!brand) {
            return res.status(404).json({
                success: false,
                message: 'Brand not found'
            });
        }

        await Brand.findByIdAndUpdate(brandId, { isBlocked: false });

        res.json({
            success: true,
            message: 'Brand restored successfully'
        });

    } catch (error) {
        console.log('Error restoring brand:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// Add method to view deleted brands
const getDeletedBrands = async (req, res) => {
    try {
        const deletedBrands = await Brand.find({ isBlocked: true }).sort({ createdAt: -1 });
        console.log('Fetched deleted brands:', deletedBrands.length);

        return res.status(200).json({
            success: true,
            brands: deletedBrands || [],
            message: deletedBrands.length ? 'Deleted brands fetched successfully' : 'No deleted brands found'
        });
    } catch (error) {
        console.error('Error in getDeletedBrands:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch deleted brands'
        });
    }
};

//This controller fetches top brands based on order analysis
const getTopBrands = async (req, res) => {
    try {
        // Aggregate pipeline to get top brands
        const topBrands = await Order.aggregate([
            // Unwind the orderedItems array
            { $unwind: "$orderedItems" },
            // Lookup to get product details
            {
                $lookup: {
                    from: "products",
                    localField: "orderedItems.product",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            // Group by brand and calculate total orders and revenue
            {
                $group: {
                    _id: "$product.brand",
                    totalOrders: { $sum: "$orderedItems.quantity" },
                    totalRevenue: { $sum: "$orderedItems.totalPrice" }
                }
            },
            // Sort by total orders in descending order
            { $sort: { totalOrders: -1 } },
            // Limit to top 5 brands
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            topBrands
        });
        
    } catch (error) {
        console.log(`Admin Side :-- Fetching top brands failed. Because `, error.message);
        console.log("==========");
        res.status(500).json({
            success: false,
            message: "Failed to fetch top brands"
        });
    }
}

module.exports = {
    loadBrandPage,
    addBrands,
    getBrandById,
    updateBrand,
    deleteBrand,
    restoreBrand,
    getDeletedBrands,
    getTopBrands
}