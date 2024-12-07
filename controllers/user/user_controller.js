const User = require('../../models/userSchema')


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

const addUser = async (req,res) => {
    
    const {name,email,phone,password} = req.body
    try {

        const newUser = new User({name,email,phone,password})
        console.log(newUser)
        await newUser.save();
        res.render("user/login")
        
    } catch (error) {
        console.log(error.message)
        res.status(500).send("Server error")
    }

}

module.exports = {
    load_landing,
    load_page404,
    load_loginpage,
    load_signuppage,
    addUser
}