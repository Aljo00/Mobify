const express = require("express");
const user_router = express.Router();

const user_controller = require("../controllers/user/user_controller");
const productController = require("../controllers/user/product_controller");
const cartController = require("../controllers/user/cart_controller");
const accountController = require("../controllers/user/account_controller");
const orderController = require("../controllers/user/order_controller");
const passport = require("passport");

const User = require("../models/userSchema");

const userAuth = require("../middleware/userAuth");

user_router.get("/", userAuth.is_UserBlocked, user_controller.load_homePage);

user_router.get("/page404", user_controller.load_page404);

user_router.get(
  "/signup",
  userAuth.is_UserLogout,
  user_controller.load_signuppage
);

user_router.post("/signup", user_controller.addUser);

user_router.post("/verify-otp", user_controller.verifyOtp);

user_router.post("/resend-otp", user_controller.resendOtp);

user_router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

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
          return res.render("user/login", {
            message: "User is blocked by the admin",
          });
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

user_router.get(
  "/login",
  userAuth.is_UserLogout,
  user_controller.load_loginpage
);

user_router.post("/login", user_controller.verifyLogin);

//Product Detail page
user_router.get("/product/:id", productController.loadProductDetails);

user_router.get("/product/combo/:id", productController.loadComboDetails);

//Cart Management
user_router.get(
  "/add-to-cart/:id",
  userAuth.is_UserLogin,
  userAuth.is_UserBlocked,
  cartController.addtoCart
);

user_router.post(
  "/add-to-cart",userAuth.is_UserLogin
)

user_router.get("/cart", userAuth.is_UserLogin,userAuth.is_UserBlocked, cartController.loadCartPage);

user_router.post(
  "/cart/delete/:id",
  userAuth.is_UserLogin,
  cartController.deleteFromCart
);

//Order Management
user_router.get(
  "/checkout",
  userAuth.is_UserLogin,
  orderController.processCheckout
);

//User Profile Management
user_router.get(
  "/account",
  userAuth.is_UserLogin,
  accountController.loadAccountPage
);

user_router.get(
  "/addresses",
  userAuth.is_UserLogin,
  accountController.loadAddressPage
);

user_router.get(
  "/add-address",
  userAuth.is_UserLogin,
  accountController.loadAddAddressPage
);

user_router.post(
  "/add-address",
  userAuth.is_UserLogin,
  accountController.addNewAddress
);

user_router.get("/logout", user_controller.logout);

module.exports = user_router;
