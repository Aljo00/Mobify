const express = require("express");
const admin_route = express.Router();

//This middleware is used for checking the session of the admin.
const adminAuth = require("../middleware/JWTAdminAuth");

//This is controller for the admin login and verify and also logout controlling.
const adminController = require("../controllers/admin/adminController");

const customerController = require("../controllers/admin/customerController");

const categoryController = require("../controllers/admin/categoryController");

const brandController = require("../controllers/admin/brandController");

const productController = require("../controllers/admin/productController");

const orderController = require("../controllers/admin/orderController");

const couponController = require("../controllers/admin/couponController");

const multer = require("multer");

const storage = require("../helpers/multer");

const uploads = multer({ storage: storage });

admin_route.get("/error", adminController.show_error);

//Admin login management routes
admin_route.get(
  "/login",
  adminAuth.protectAdminLogin,
  adminController.loadLogin
);

admin_route.post("/login", adminController.verifyAdminLogin);

admin_route.get(
  "/dashboard",
  adminAuth.protectAdmin,
  adminController.loadDashboard
);

admin_route.get(
  "/custom-range-data",
  adminAuth.protectAdmin,
  adminController.getCustomRangeData
);

admin_route.get(
  "/download-report",
  adminAuth.protectAdmin,
  adminController.downloadReport
);

admin_route.get(
  "/chart-stats",
  adminAuth.protectAdmin,
  adminController.getChartStats
);

admin_route.get("/logout", adminController.logout);

//Admin users management routes
admin_route.get(
  "/users",
  adminAuth.protectAdmin,
  customerController.customerInfo
);

admin_route.get(
  "/blockCustomer",
  adminAuth.protectAdmin,
  customerController.blockCustomer
);

admin_route.get(
  "/unblockCustomer",
  adminAuth.protectAdmin,
  customerController.unblockCustomer
);

//Admin category Management routes
admin_route.get(
  "/category",
  adminAuth.protectAdmin,
  categoryController.categoryInfo
);

admin_route.post("/addCategory", categoryController.addCategory);

admin_route.get(
  "/editCategory",
  adminAuth.protectAdmin,
  categoryController.getEditCategory
);

admin_route.post("/editCategory/:id", categoryController.editCategory);

admin_route.post("/deleteCategory/:id", categoryController.softDeleteCategory);

admin_route.put(
  "/category/add-offer",
  adminAuth.protectAdmin,
  categoryController.addOffer
);

admin_route.put(
  "/category/remove-offer",
  adminAuth.protectAdmin,
  categoryController.removeOffer
);

// Fix the route definition
admin_route.get(
  "/top-categories",
  adminAuth.protectAdmin,
  categoryController.getTopCategories  // Make sure this is exported from categoryController
);

//Admin Brand Management Routes
admin_route.get(
  "/brands",
  adminAuth.protectAdmin,
  brandController.loadBrandPage
);

// Add these routes BEFORE the /:id route
admin_route.get(
  "/brands/deleted",
  adminAuth.protectAdmin,
  brandController.getDeletedBrands
);

admin_route.post(
  "/brands/restore/:id",
  adminAuth.protectAdmin,
  brandController.restoreBrand
);

admin_route.get("/brands/top", brandController.getTopBrands);

// These routes should come after the specific routes
admin_route.get('/brands/:id', adminAuth.protectAdmin, brandController.getBrandById);
admin_route.put('/brands/:id', adminAuth.protectAdmin, uploads.single('image'), brandController.updateBrand);
admin_route.post('/brands/delete/:id', adminAuth.protectAdmin, brandController.deleteBrand);

//Admin Prduct Management Routes
admin_route.get(
  "/addProducts",
  adminAuth.protectAdmin,
  productController.loadProductAddPage
);

admin_route.post(
  "/addProducts",
  uploads.array("images", 4),
  productController.addProducts
);

admin_route.get(
  "/products",
  adminAuth.protectAdmin,
  productController.getAllProducts
);

admin_route.get(
  "/top-products",
  adminAuth.protectAdmin,
  async (req, res, next) => {
    try {
      console.log('🎯 Top products route hit');
      await productController.getTopProducts(req, res);
    } catch (error) {
      console.error('❌ Error in top-products route:', error);
      res.status(500).json({
        error: 'Route error: Failed to fetch top products',
        details: error.message
      });
    }
  }
);

admin_route.put(
  "/products/add-offer",
  adminAuth.protectAdmin,
  productController.addOffer
);

admin_route.put(
  "/products/remove-offer",
  adminAuth.protectAdmin,
  productController.removeOffer
);

admin_route.post("/deleteProduct/:id", productController.softDeleteProduct);

admin_route.get(
  "/editProduct",
  adminAuth.protectAdmin,
  productController.getEditProduct
);

admin_route.post(
  "/editProduct/:id",
  uploads.array("images", 4),
  productController.editProduct
);

// Route to get product combos
admin_route.get(
  "/getProductCombos/:productId",
  adminAuth.protectAdmin,
  productController.loadComboDetails
);

admin_route.post("/deleteimage", productController.deleteSingleImage);

//order Management

admin_route.get(
  "/orders",
  adminAuth.protectAdmin,
  orderController.getOrdersPage
);

admin_route.post(
  "/orders/update-status",
  adminAuth.protectAdmin,
  orderController.updateStatus
);

admin_route.get(
  "/coupons",
  adminAuth.protectAdmin,
  couponController.getCouponsPage
);
admin_route.post(
  "/coupons/add",
  adminAuth.protectAdmin,
  couponController.addCoupon
);
admin_route.put(
  "/coupons/toggle-status/:id",
  adminAuth.protectAdmin,
  couponController.toggleStatus
);
admin_route.delete(
  "/coupons/delete/:id",
  adminAuth.protectAdmin,
  couponController.deleteCoupon
);

module.exports = admin_route;
