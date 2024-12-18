const User = require("../../models/userSchema")

const Product = require("../../models/productSchema")

const mongoose = require("mongoose");

const bcrypt = require("bcrypt");

const show_error = async (req,res) => {
    return res.render("admin/error");
}

const loadLogin = async (req,res) => {

    try {

        return res.render("admin/admin-login")
        
    } catch (error) {
        console.log("Error found: ", error.message);
        res.redirect("/admin/error")
        
    }
    
}

const verifyAdminLogin = async (req,res) => {

    try {

        const {email,password} = req.body;

        const findAdmin = await User.findOne({email, isAdmin:true})

        if(findAdmin){

            const passwordMatch = await bcrypt.compare(password, findAdmin.password)

            if(passwordMatch){
                req.session.admin = true;
                return res.redirect("/admin/dashboard")
            }else{
                return res.render("admin/admin-login",{message: "Incorrect Password"})
            }

        }else{
            return res.render("admin/admin-login",{message: "No user found"})
        }
        
    } catch (error) {
        console.log("An error occured in the login page :-- ",error.message);
        res.render("admin/admin-login",{message:"Login Failed! Please try again"})
    }
    
}

const loadDashboard = async (req,res) => {

    try {

        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalProducts = await Product.countDocuments();
        return res.render("admin/dashboard",{
            totalProducts,
            totalUsers
        });
        
    } catch (error) {
        console.log("Error found: ", error.message);
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