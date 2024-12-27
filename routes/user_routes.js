const express = require("express");
const user_router = express.Router();

const user_controller = require('../controllers/user/user_controller');
const productController = require('../controllers/user/product_controller')
const passport = require("passport");

const User = require("../models/userSchema")

const userAuth = require("../middleware/userAuth")

user_router.get('/',user_controller.load_homePage);

user_router.get('/page404',user_controller.load_page404);

user_router.get('/signup',userAuth.is_UserLogout,user_controller.load_signuppage)

user_router.post('/signup', user_controller.addUser)

user_router.post('/verify-otp', user_controller.verifyOtp);

user_router.post('/resend-otp', user_controller.resendOtp);

user_router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

user_router.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {
        try {
            // Check if the user is blocked
            const user = await User.findById(req.user._id);

            if (user.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                    return res.render("user/login",{message: "User is blocked by the admin"})
                });



            } else {
                
                req.session.regenerate((err) => {
                    if (err) {
                        console.error("Error regenerating session:", err);
                        return res.redirect("/login");
                    }

                    req.session.user = req.user._id;

                    res.redirect("/");
                });
            }
        } catch (error) {
            console.error("Error checking user block status:", error);
            res.redirect("/login?message=An error occurred. Please try again.");
        }
    }
);



user_router.get('/login',userAuth.is_UserLogout,user_controller.load_loginpage)

user_router.post('/login',user_controller.verifyLogin)

user_router.get('/product/:id', productController.loadProductDetails);

user_router.get("/product/combo/:id",productController.loadComboDetails)

user_router.get('/logout',user_controller.logout)

module.exports = user_router