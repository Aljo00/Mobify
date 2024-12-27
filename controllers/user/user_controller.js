const User = require('../../models/userSchema');
const Brand = require('../../models/brandSchema');
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const { response } = require('../../app');
const env = require("dotenv").config();

const load_page404 = async (req, res) => {
    try {
        res.status(404).render("user/page404");
    } catch (error) {
        res.redirect('/page404');
    }
};

const load_homePage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true });

        // Pagination parameters
        const page = parseInt(req.query.page) || 1; // Current page
        const limit = 6; // Items per page
        const skip = (page - 1) * limit; // Items to skip

        // Fetch Refurbished Phones
        const refurbishedCount = await Product.countDocuments({
            isBlocked: false,
            combos: { $elemMatch: { quantity: { $gt: 0 } } },
            category: "Refurbished Phones", // Replace with the actual category identifier for refurbished phones
        });

        const refurbishedPhones = await Product.find({
            isBlocked: false,
            combos: { $elemMatch: { quantity: { $gt: 0 } } },
            category: "Refurbished Phones",
        })
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        // Fetch New Phones
        const newCount = await Product.countDocuments({
            isBlocked: false,
            combos: { $elemMatch: { quantity: { $gt: 0 } } },
            category: "New Phone", // Replace with the actual category identifier for new phones
        });

        const newPhones = await Product.find({
            isBlocked: false,
            combos: { $elemMatch: { quantity: { $gt: 0 } } },
            category: "New Phone",
        })
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit);

        // Calculate total pages for pagination
        const totalPagesRefurbished = Math.ceil(refurbishedCount / limit);
        const totalPagesNew = Math.ceil(newCount / limit);

        const user = req.session.user;
        const brand = await Brand.find({}).limit(7);

        const userData = user ? await User.findById(user) : null;

        return res.render("user/home", {
            user: userData,
            brand: brand,
            refurbishedPhones,
            newPhones,
            currentPage: page,
            totalPagesRefurbished,
            totalPagesNew,
        });
    } catch (error) {
        console.log("Error found: ", error.message);
        res.status(500).send("Server error");
    }
};

const load_loginpage = async (req, res) => {
    try {
        res.render("user/login");
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
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASS
            }
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
            `
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
            return res.render("user/signup", { message: "User with this email already exists" });
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
        res.render('user/page404');
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
                password: hashPassword
            });

            await newUser.save();
            req.session.user = newUser._id;
            res.json({ success: true, redirectUrl: "/login" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP! Please try again." });
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
            return res.status(400).json({ success: false, message: "Email not found in the session" });
        }

        const otp = generateOtp();
        req.session.sendOtp = otp;

        const otpSent = await emailVerification(email, otp);
        if (otpSent) {
            console.log(`Resent OTP: ${otp}`);
            res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.log("Error in resending OTP: ", error.message);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const verifyLogin = async (req,res) => {

    try {

        const {email,password} = req.body;

        const findUser = await User.findOne({isAdmin: 0, email: email});

        if(!findUser){
            return res.render("user/login",{message: "No user found"})
        }

        if(findUser.isBlocked){
            return res.render("user/login",{message: "User is blocked by the admin"})
        }

        if(findUser.googleId){
            return res.render("user/login",{message: "You used the google sign"})
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password)

        if(!passwordMatch){
            return res.render("user/login",{message: "Incorrect Password"})
        }

        req.session.user = findUser._id;
        console.log(req.session.user)
        res.redirect("/");
        
    } catch (error) {

        console.log("An error occured in the login page :-- ",error.message);
        res.render("user/login",{message:"Login Failed! Please try again"})
        
    }
    
}

const logout = async (req,res) => {

    try {

        req.session.destroy((err)=>{
            if(err){
                console.log("Session destroy error:- ", err.message)
                return res.redirect('/page404')
            }

            return res.redirect("/");
        })
        
    } catch (error) {
        console.log("Session destroy error:- ", error.message)
        return res.redirect('/page404')
    }
    
}

module.exports = {
    load_homePage,
    load_page404,
    load_loginpage,
    load_signuppage,
    addUser,
    verifyOtp,
    resendOtp,
    verifyLogin,
    logout
};