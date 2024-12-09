const express = require("express");
const admin_route = express.Router();

const adminAuth = require("../middleware/adminAuth");

const adminController = require("../controllers/admin/adminController");

admin_route.get('/error',adminController.show_error)

admin_route.get('/login',adminController.loadLogin);

admin_route.post('/login',adminController.verifyAdminLogin);

admin_route.get('/dashboard',adminController.loadDashboard);



module.exports = admin_route