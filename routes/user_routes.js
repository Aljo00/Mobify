const express = require("express");
const user_router = express.Router();

const user_controller = require('../controllers/user/user_controller');
const passport = require("passport");

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
    (req, res) => {
        // Regenerate session for Google user
        req.session.regenerate((err) => {
            if (err) {
                console.error("Error regenerating session:", err);
                return res.redirect("/login");
            }

            // Save the Google user's ID in the session
            req.session.user = req.user._id; // Use Google ID for session management
            req.session.isGoogleUser = true; // Optional: Mark the session as Google-authenticated

            res.redirect("/"); // Redirect to homepage or desired location
        });
    }
);


user_router.get('/login',userAuth.is_UserLogout,user_controller.load_loginpage)

user_router.post('/login',user_controller.verifyLogin)

user_router.get('/logout',user_controller.logout)

module.exports = user_router