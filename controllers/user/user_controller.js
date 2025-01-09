const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const cart = require("../../models/cartSchema");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { generateToken } = require("../../config/JWT");
const env = require("dotenv").config();

const load_page404 = async (req, res) => {
  try {
    res.status(404).render("user/page404");
  } catch (error) {
    res.redirect("/page404");
  }
};

const load_homePage = async (req, res) => {
  try {
    // Fetch products
    const refurbishedPhones = await Product.find({
      isBlocked: false,
      category: "Refurbished Phones",
    }).limit(6);

    const newPhones = await Product.find({
      isBlocked: false,
      category: "New Phone",
    }).limit(6);

    const newArrivals = await Product.find({
      isBlocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(6);

    const user = req.user;

    const brand = await Brand.find({});

    // Get cart item count from session or calculate it
    let cartItemCount = 0;
    let userData = null;

    if (user) {
      const userId = user.id;

      const userCart = await cart.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      });

      cartItemCount = userCart ? userCart.items.length : 0;

      // Fetch user details from the database
      userData = await User.findById(userId);

      // Generate initials if no profile picture exists
      if (!userData.profileImage) {
        const name = userData.name || "";
        userData.initials = name
          .replace(/\s+/g, "") // Remove all spaces in the name
          .slice(0, 2) // Take the first two characters
          .toUpperCase(); // Convert to uppercase
      }
    } else {
      console.log("User not logged in or session not set.");
    }

    return res.render("user/home", {
      user: userData,
      brand: brand,
      refurbishedPhones,
      newPhones,
      newArrivals,
      cartItemCount,
    });
  } catch (error) {
    console.log("Error found: ", error.message);
    res.status(500).send("Server error");
  }
};

const load_loginpage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    res.render("user/login", {
      brand: brand,
    });
  } catch (error) {
    console.log("Error found: ", error.message);
    res.status(500).send("Server error");
  }
};

const load_signuppage = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    console.log("Error found: ", error.message);
    res.status(500).send("Server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function emailVerification(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Mobify Support" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Verify Your Account - Mobify",
      html: `
                <h1>Welcome to Mobify!</h1>
                <p>To complete your sign-up process, please use the OTP below:</p>
                <h2>${otp}</h2>
                <p>This OTP is valid for the next <strong>2 minutes</strong>. Do not share it with anyone.</p>
                <br>
                <p>If you did not request this, please contact our support at <a href="mailto:support@mobify.com">support@mobify.com</a>.</p>
                <p>Thank you, <br> Mobify Team</p>
            `,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log("Email was not sent: ", error.message);
    return false;
  }
}

const addUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const findEmail = await User.findOne({ email });
    if (findEmail) {
      return res.render("user/signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();
    const sentOtp = await emailVerification(email, otp);

    if (!sentOtp) {
      return res.json("OTP was not sent");
    }

    req.session.sendOtp = otp;
    req.session.userData = { email, password, phone, name };

    console.log(`OTP sent: ${otp}`);
    res.render("user/verifyOtp");
  } catch (error) {
    console.log("Sign-up failed. An error occurred: ", error.message);
    res.render("user/page404");
  }
};

const securePassword = async (password) => {
  try {
    const hashPassword = await bcrypt.hash(password, 10);
    return hashPassword;
  } catch (error) {
    console.log("An error occurred: ", error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(`User entered OTP: ${otp}`);

    if (otp === req.session.sendOtp) {
      const user = req.session.userData;
      const hashPassword = await securePassword(user.password);

      const newUser = new User({
        name: user.name,
        email: user.email,
        phone: user.phone,
        password: hashPassword,
      });

      // Generate JWT using the `generateToken` helper function
      const token = generateToken(user);
      console.log("Generated Token:", token);

      // Send the token to the client in a secure HTTP-only cookie
      res.cookie("userAuth", token, {
        httpOnly: true, // Prevent JavaScript access
        secure: process.env.NODE_ENV === "production", // Use HTTPS in production
        maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
      });

      await newUser.save();

      res.json({ success: true, redirectUrl: "/login" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP! Please try again." });
    }
  } catch (error) {
    console.log("Verification failed. An error occurred: ", error.message);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in the session" });
    }

    const otp = generateOtp();
    req.session.sendOtp = otp;

    const otpSent = await emailVerification(email, otp);
    if (otpSent) {
      console.log(`Resent OTP: ${otp}`);
      res
        .status(200)
        .json({ success: true, message: "OTP resent successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    console.log("Error in resending OTP: ", error.message);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("user/login", { message: "No user found" });
    }

    if (findUser.isBlocked) {
      return res.render("user/login", {
        message: "User is blocked by the admin",
      });
    }

    if (findUser.googleId) {
      return res.render("user/login", { message: "You used the google sign" });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/login", { message: "Incorrect Password" });
    }

    // Generate JWT using the `generateToken` helper function
    const token = generateToken(findUser);
    console.log("Generated Token:", token);

    // Send the token to the client in a secure HTTP-only cookie
    res.cookie("userAuth", token, {
      httpOnly: true, // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
    });

    res.redirect("/");
  } catch (error) {
    console.log("An error occured in the login page :-- ", error.message);
    res.render("user/login", { message: "Login Failed! Please try again" });
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("userAuth", {
      httpOnly: true, // Ensure the cookie is not accessible via JavaScript
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "strict", // Ensure the cookie is sent only with same-site requests
    });

    return res.redirect("/");
  } catch (error) {
    console.log("Session destroy error:- ", error.message);
    return res.redirect("/page404");
  }
};

module.exports = {
  load_homePage,
  load_page404,
  load_loginpage,
  load_signuppage,
  addUser,
  verifyOtp,
  resendOtp,
  verifyLogin,
  logout,
};
