const express = require("express");
const admin_route = express.Router();

const adminAuth = require("../middleware/adminAuth");

const adminController = require("../controllers/admin/adminController");

const customerController = require("../controllers/admin/customerController")

const categoryController = require("../controllers/admin/categoryController");

const brandController = require("../controllers/admin/brandController");

const multer = require("multer");

const storage = require("../helpers/multer");

const uploads = multer({storage:storage});

admin_route.get('/error',adminController.show_error);

//Admin login management routes
admin_route.get('/login',adminAuth.is_AdminLogout,adminController.loadLogin);

admin_route.post('/login',adminController.verifyAdminLogin);

admin_route.get('/dashboard',adminAuth.is_AdminLogin,adminController.loadDashboard);

admin_route.get('/logout',adminController.logout)

//Admin users management routes
admin_route.get('/users',adminAuth.is_AdminLogin,customerController.customerInfo)

admin_route.get('/blockCustomer',customerController.blockCustomer)

admin_route.get('/unblockCustomer',customerController.unblockCustomer);

//Admin category Management routes
admin_route.get('/category',adminAuth.is_AdminLogin,categoryController.categoryInfo);

admin_route.post('/addCategory',categoryController.addCategory);

admin_route.get('/editCategory',adminAuth.is_AdminLogin,categoryController.getEditCategory);

admin_route.post('/editCategory/:id',categoryController.editCategory)

admin_route.post('/deleteCategory/:id', categoryController.softDeleteCategory);

//Admin Brand Management Routes
admin_route.get("/brands",adminAuth.is_AdminLogin,brandController.loadBrandPage)

admin_route.post("/addBrands",uploads.single("image"),brandController.addBrands)




module.exports = admin_route