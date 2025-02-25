const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const protect = (req, res, next) => {
  try {
    const token = req.cookies.userAuth;

    if (!token) {
      return res.redirect("/login");
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decode;
    next();
  } catch (error) {
    console.log(error.message);
    return res.redirect("/login");
  }
};

const protectLogin = (req,res,next) => {
  try {
    const token = req.cookies.userAuth;

    if (!token) {
      next();
    }else{
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decode;
      
      return res.redirect("/");
    }
  } catch (error) { 
    console.log(error.message);
    next();
  }
}

const notProtect = (req, res, next) => {
  try {
    const token = req.cookies.userAuth;

    if (token) {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decode;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    console.log(error.message);
    return res.render("user/page404");
  }
};

const user_IsBlocked = async (req, res, next) => {
  try {

    if(req.user){
      const user = req.user;
      const findUser = await User.findOne({ _id: user.id });
      if (findUser.isBlocked) {
        res.clearCookie("userAuth", {
          httpOnly: true, // Ensure the cookie is not accessible via JavaScript
          secure: process.env.NODE_ENV === "production", // Use HTTPS in production
        });
        return res.render("user/login", {
          message: "User is blocked by the admin",
        });
      } else {
        next();
      }
    }else{
      next();
    }

  } catch (error) {
    console.log(error.message);
    return res.render("user/signup");
  }
};

module.exports = {
  protect,
  notProtect,
  user_IsBlocked,
  protectLogin
};
