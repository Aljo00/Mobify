const User = require('../../models/userSchema')

const nodemailer = require('nodemailer')

// using the bcrypt module for encrypting the password
const bcrypt = require('bcrypt')
const { response } = require('../../app')

const env = require("dotenv").config()


const load_page404 = async (req,res) => {

    try {

        res.status(404).render("user/page404")
        
    } catch (error) {
        res.redirect('/page404')
    }

}

const load_landing = async (req,res) => {
    
    try {

        console.log("user in landing page")
        return res.render("user/home");
        
    } catch (error) {
        console.log("error found:- ",error.message);
        res.status(500).send("Server error")
    }

}

const load_loginpage = async (req,res) => {

    try {

        res.render("user/login")
        
    } catch (error) {
        console.log("Error found:-- ",error.message);
        res.status(500).send("An server found");
    }

}

const load_signuppage = async (req,res) => {

    try {

        res.render("user/signup")
        
    } catch (error) {
        console.log("Error found:-- ",error.message);
        res.status(500).send("An server found");
    }

}

function generateOtp(){
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function emailVerification(email,otp) {
    
    try {

        const trnasporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASS
            }
        })

        const info = await trnasporter.sendMail({
            from: `"Mobify Support" <${process.env.NODEMAILER_EMAIL}>`,
            to: email, // Recipient email
            subject: "Verify Your Account - Mobify",
            html: `
                <h1>Welcome to Mobify!</h1>
                <p>To complete your sign-up process, please use the OTP below:</p>
                <h2>${otp}</h2>
                <p>This OTP is valid for the next <strong>10 minutes</strong>. Do not share it with anyone.</p>
                <br>
                <p>If you did not request this, please contact our support at <a href="mailto:support@mobify.com">support@mobify.com</a>.</p>
                <p>Thank you, <br> Mobify Team</p>
            `
        })

        return info.accepted.length > 0;
        
    } catch (error) {
        console.log("Email was not sended:-- ",error.message)
        return false
    }

}

const addUser = async (req,res) => {
    
    
    try {

        const {name,email,phone,password} = req.body
        const findEmail = await User.findOne({email});
        if(findEmail){
            res.render("user/signup",{message: "User with this e-Mail already exists"})
        }

        const otp = generateOtp();

        const sentOtp = await emailVerification(email,otp)

        if(!sentOtp){
            res.json("Otp was not sent")
        }

        req.session.sendOtp = otp;
        req.session.userData = {email,password,phone,name};

        console.log(sentOtp)
        console.log(`Otp sent ${otp}`)
        res.render("user/verifyOtp");
        
    } catch (error) {
        console.log("Sign in failed. an error occured:-- ",error.message)
        res.render('user/page404')
    }

}

const securePassword = async(password)=>{
    try{

        const hashPassword = await bcrypt.hash(password, 10);
        return hashPassword;

    }catch(error){
        console.log("An error is founded" + error.message)
    }
}

const verifyOtp = async (req,res) => {
    
    try {

        const {otp} = req.body;
        console.log(`User entered otp = ${otp}`)

        if(otp === req.session.sendOtp){
            const user = req.session.userData;
            const hashPassword = await securePassword(user.password)

            const addUser = new User({
                name:user.name,
                email: user.email,
                phone: user.phone,
                password: hashPassword
            })

            await addUser.save();
            req.session.user = addUser._id;
            res.json({success: true, redirectUrl:"/login"})
        }else{
            res.status(400).json({success: false, message:"Invalid otp! please try again"})
        }
        
    } catch (error) {
        console.log("Sign in failed. an error occured:-- ",error.message)
        res.status(500).json({success:false, message:"An error occured"})
    }

}

const resendOtp = async (req,res) => {
    
    try {

        const {email} = req.session.userData
        if (!email) {
            return res.status(400).json({success:false, message:"email not found in the session"})
        }

        const otp = generateOtp();
        req.session.sendOtp = otp;

        const otpSent = await emailVerification(email,otp);
        if(otpSent){
            console.log(`Resended the otp ${otp}`);
            res.status(200).json({success:true, message:"Otp resend successfully"})
        }else{
            res.status(500).json({success:false, message:"Failed to resend otp. please try again"})
        }
        
    } catch (error) {
        console.log("error in resending otp:-- ",error.message)
        res.status(500).json({success:false, message:"An error occured"})
    }

}

module.exports = {
    load_landing,
    load_page404,
    load_loginpage,
    load_signuppage,
    addUser,
    verifyOtp,
    resendOtp
}