const jwt = require("jsonwebtoken");

const protectAdmin = (req, res, next) => {
  try {
    const token = req.cookies.adminAuth;

    if (!token) {
      return res.redirect("/admin/login");
    }

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decode;
    next();
  } catch (error) {
    console.log(error.message);
    return res.redirect("/admin/login");
  }
};

const protectAdminLogin = (req, res, next) => {
  try {
    const token = req.cookies.adminAuth;

    if (!token) {
      next();
    } else {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = decode;

      return res.redirect("/admin/dashboard");
    }
  } catch (error) {
    console.log(error.message);
    next();
  }
};

module.exports = {
  protectAdmin,
  protectAdminLogin,
};
