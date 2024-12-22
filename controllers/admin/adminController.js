const User = require("../../models/userSchema")

const Product = require("../../models/productSchema")

const mongoose = require("mongoose");

//this is module is checking the hashpassword of the admin.
const bcrypt = require("bcrypt");

//This page is used for rendering error page whenever a error will found it will render there.
const show_error = async (req,res) => {
    return res.render("admin/error");
}

//This is for rendering the admin Login Page.
const loadLogin = async (req,res) => {

    try {
        console.log("Admin Login page rendered successfully")
        console.log("==========");

        return res.render("admin/admin-login")
        
    } catch (error) {
        console.log("Admin Login page rendering Failed:--",error.message)
        console.log("==========");

        res.redirect("/admin/error")
        
    }
    
}

//This controller check the admin entered password and email is correct or not.
const verifyAdminLogin = async (req,res) => {

    try {

        const {email,password} = req.body;
        console.log(`Admin Entered password  ${password} and userName ${email}`)
        console.log("==========");

        const findAdmin = await User.findOne({email, isAdmin:true})

        if(findAdmin){

            const passwordMatch = await bcrypt.compare(password, findAdmin.password)

            if(passwordMatch){
                req.session.admin = true;
                console.log("Admin Entered password and userName is correct and redirected to the dashboard")
                console.log("==========");
                return res.redirect("/admin/dashboard")
            }else{
                console.log("Admin Entered password Incorrect")
                console.log("==========");
                return res.render("admin/admin-login",{message: "Incorrect Password"})
            }

        }else{
            console.log("Admin Entered userName is Incorrect")
            console.log("==========");
            return res.render("admin/admin-login",{message: "No user found"})
        }
        
    } catch (error) {
        console.log("Admin Entered password and userName Found an error ",error.message)
        console.log("==========");
        res.render("admin/admin-login",{message:"Login Failed! Please try again"})
    }
    
}

const loadDashboard = async (req,res) => {

    try {

        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalProducts = await Product.countDocuments();
        console.log("Admin Dashboard rendered succesfully completed")
        console.log(`Total Users is ${totalUsers}`);
        console.log(`Total Products is ${totalProducts}`);
        console.log("==========");
        return res.render("admin/dashboard",{
            totalProducts,
            totalUsers
        });
        
    } catch (error) {
        console.log("Admin Dashboard Rendered Incomplete because ",error.message)
        console.log("==========");
        res.redirect("/admin/error")
    }
    
}

const logout = async (req,res) => {

    try {

        req.session.destroy(err =>{
            if(err){
                console.log("error in distroying the session :-- ",err.message);
                return res.redirect('/admin/error')
            }

            console.log("Admin LogOut succesfully completed")
            console.log("==========");
            res.redirect("/admin/login")
        })
        
    } catch (error) {
        console.log("Error found: ", error.message);
        res.redirect("/admin/error")
    }
    
}

module.exports = {
    loadLogin,
    verifyAdminLogin,
    loadDashboard,
    show_error,
    logout
}