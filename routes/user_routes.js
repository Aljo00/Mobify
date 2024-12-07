const express = require("express");
const user_router = express.Router();

const user_controller = require('../controllers/user/user_controller')

user_router.get('/',user_controller.load_landing);

user_router.get('/page404',user_controller.load_page404);

user_router.get('/login',user_controller.load_loginpage)

user_router.get('/signup',user_controller.load_signuppage)

user_router.post('/signup', user_controller.addUser)

module.exports = user_router