const User = require('../models/userSchema');

// if not it will redirect to the login page.
const is_UserLogin = async (req, res, next) => {
    try {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
    }
}

const is_UserBlocked = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = req.session.user;
            const findUser = await User.findOne({ _id: user });
            if (findUser.isBlocked) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                    }
                    return res.render("user/login", {
                        message: "User is blocked by the admin",
                    });
                });
            } else {
                next();
            }
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
}

//if exists it will redirect to the home page.
const is_UserLogout = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports ={
    is_UserLogin,
    is_UserLogout,
    is_UserBlocked
}