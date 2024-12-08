const express = require("express");
const user_router = express.Router();

const user_controller = require('../controllers/user/user_controller');
const passport = require("passport");

user_router.get('/',user_controller.load_landing);

user_router.get('/page404',user_controller.load_page404);

user_router.get('/login',user_controller.load_loginpage)

user_router.get('/signup',user_controller.load_signuppage)

user_router.post('/signup', user_controller.addUser)

user_router.post('/verify-otp',user_controller.verifyOtp)

user_router.post('/resend-otp',user_controller.resendOtp);

user_router.get('/auth/google',passport.authenticate('google',{scope:['profile','email',]}));

user_router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    res.redirect('/')
})

module.exports = user_router