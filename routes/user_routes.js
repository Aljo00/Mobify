const express = require("express");
const user_router = express.Router();

const user_controller = require("../controllers/user/user_controller");
const productController = require("../controllers/user/product_controller");
const cartController = require("../controllers/user/cart_controller");
const accountController = require("../controllers/user/account_controller");
const orderController = require("../controllers/user/order_controller");
const shopController = require("../controllers/user/shop_controller");
const wishlistController = require("../controllers/user/wishlist_controller");
const walletController = require("../controllers/user/walletController");
const passport = require("passport");
const userAuth = require("../middleware/JWTUserAuth");
const multer = require("multer");

const storage = require("../helpers/multer");

// user_router.use(userAuth.user_IsBlocked);

const uploads = multer({ storage: storage });
const { generateToken } = require("../config/JWT");

const User = require("../models/userSchema");

// const userAuth = require("../middleware/userAuth");

user_router.get("/", userAuth.notProtect, user_controller.load_homePage);

user_router.get("/page404", user_controller.load_page404);

user_router.get(
  "/signup",
  userAuth.protectLogin,
  user_controller.load_signuppage
);

user_router.post("/signup", user_controller.addUser);

user_router.post("/verify-otp", user_controller.verifyOtp);

user_router.post("/resend-otp", user_controller.resendOtp);

user_router.get(
  "/auth/google",
  userAuth.protectLogin,
  passport.authenticate("google", { scope: ["profile", "email"] })
);

user_router.get(
  "/auth/google/callback",
  userAuth.protectLogin,
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      // Check if the user is blocked
      const user = await User.findById(req.user._id);

      if (user.isBlocked) {
        res.clearCookie("userAuth", {
          httpOnly: true, // Ensure the cookie is not accessible via JavaScript
          secure: process.env.NODE_ENV === "production", // Use HTTPS in production
          sameSite: "strict", // Ensure the cookie is sent only with same-site requests
        });
        return res.render("user/login", {
          message: "User is blocked by the admin",
        });
      } else {
        const user = req.user;

        // Generate JWT using the `generateToken` helper function
        const token = generateToken(user);
        console.log("Generated Token:", token);

        // Send the token to the client in a secure HTTP-only cookie
        res.cookie("userAuth", token, {
          httpOnly: true, // Prevent JavaScript access
          secure: process.env.NODE_ENV === "production", // Use HTTPS in production
          maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
        });

        res.redirect("/");
      }
    } catch (error) {
      console.error("Error checking user block status:", error);
      res.redirect("/login?message=An error occurred. Please try again.");
    }
  }
);

user_router.get(
  "/login",
  userAuth.protectLogin,
  user_controller.load_loginpage
);

user_router.post("/login", user_controller.verifyLogin);

//Product Detail page
user_router.get(
  "/product/:id",
  userAuth.notProtect,
  productController.loadProductDetails
);

user_router.get(
  "/product/combo/:id",
  userAuth.notProtect,
  productController.loadComboDetails
);

//Cart Management
user_router.get(
  "/add-to-cart/:id",
  userAuth.notProtect,
  cartController.addtoCart
);

user_router.get(
  "/addToCart",
  userAuth.notProtect,
  cartController.addToCartFromHome
);

user_router.post("/cart/update", userAuth.protect, cartController.updateCart);

user_router.get("/cart", userAuth.protect, cartController.loadCartPage);

user_router.post(
  "/cart/delete/:id",
  userAuth.protect,
  cartController.deleteFromCart
);

//Order Management
user_router.get("/checkout", userAuth.protect, orderController.processCheckout);

user_router.post(
  "/place-order",
  uploads.none(),
  userAuth.protect,
  orderController.placeOrder
);

user_router.get("/order-success", userAuth.protect, orderController.orderSuccess);

user_router.post("/create-order", userAuth.protect, orderController.razarPay);

user_router.post('/verify-razorpay-payment', userAuth.protect, orderController.verifyRazorpayPayment);

//User Profile Management

// Route: GET /account
user_router.get(
  "/account",
  userAuth.protect,
  accountController.loadAccountPage
);

// Route: GET /update-account
user_router.get(
  "/update-account",
  userAuth.protect,
  accountController.loadEditAccountPage
);

// Route: Patch /update-account
user_router.patch(
  "/update-account",
  userAuth.protect,
  uploads.single("profileImage"),
  accountController.editAccount
);

user_router.get(
  "/addresses",
  userAuth.protect,
  accountController.loadAddressPage
);

user_router.get(
  "/add-address",
  userAuth.protect,
  accountController.loadAddAddressPage
);

user_router.post(
  "/add-address",
  userAuth.protect,
  accountController.addNewAddress
);

user_router.get(
  "/edit-address/:id",
  userAuth.protect,
  accountController.loadEditAddressPage
);

user_router.post(
  "/edit-address/:id",
  userAuth.protect,
  accountController.updateAddress
);

user_router.delete(
  "/delete-address/:id",
  userAuth.protect,
  accountController.deleteAddress
);

user_router.get("/forgot-password", accountController.loadForgotPasswordPage);

user_router.post("/forgot-password", accountController.verifyEmail);

user_router.get("/reset-password/:token", accountController.loadResetPassword);

user_router.post("/reset-password/:token", accountController.resetPassword);

user_router.get("/orders", userAuth.protect, accountController.loadOrdersPage);

user_router.get(
  "/orders/:id",
  userAuth.protect,
  accountController.loadOrdersDetailPage
);

user_router.post(
  "/cancel-order",
  userAuth.protect,
  accountController.cancelOrder
);

user_router.post(
  "/return-request",
  userAuth.protect,
  accountController.initiateReturn
);

//Shop Management
user_router.get("/shop", userAuth.notProtect, shopController.loadShopPage);

// Update search route to use new controller
user_router.get("/search", userAuth.notProtect, shopController.searchProducts);

//wishlist Management
user_router.post(
  "/addToWishlist",
  userAuth.notProtect,
  wishlistController.addToWishlist
);

user_router.get(
  "/wishlist",
  userAuth.notProtect,
  wishlistController.load_wishlist
);

user_router.delete(
  "/wishlist/remove",
  userAuth.protect,
  wishlistController.deleteFromWishlist
);

//wallet Management
user_router.get("/wallet", userAuth.protect, walletController.load_wallet);

user_router.get("/get-user-details", userAuth.protect, (req, res) => {
  const { email } = req.user;
  if (email) {
    res.json({ success: true,email });
  } else {
    res.json({ success: false, message: "User details not found." });
  }
});

user_router.post("/add-money", userAuth.protect,walletController.addMoneyToWallet)

user_router.post("/verify-payment",userAuth.protect,walletController.verifyPayment);

const couponController = require('../controllers/user/coupon_controller');

user_router.get('/api/available-coupons', userAuth.protect, couponController.getAvailableCoupons);
user_router.post('/api/validate-coupon', userAuth.protect, couponController.validateCoupon);

const paymentController = require("../controllers/user/payment_controller");

user_router.get('/check-stock/:orderId', userAuth.protect, paymentController.checkStock);
user_router.post('/initiate-pending-payment', userAuth.protect, paymentController.initiatePendingPayment);
user_router.post('/verify-pending-payment', userAuth.protect, paymentController.verifyPendingPayment);

user_router.post('/initiate-cod-to-online', userAuth.protect, paymentController.initiateCodToOnline);
user_router.post('/verify-cod-to-online', userAuth.protect, paymentController.verifyCodToOnline);

user_router.get('/download-invoice/:orderId', userAuth.protect, accountController.downloadInvoice);

user_router.get("/aboutus", userAuth.notProtect, user_controller.load_aboutPage);

user_router.get("/contactus", userAuth.notProtect, user_controller.load_contactPage);

user_router.get("/logout", user_controller.logout);

module.exports = user_router;
