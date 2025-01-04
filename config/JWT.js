const jwt = require("jsonwebtoken");

const env = require("dotenv").config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION }
  );
};

module.exports = { generateToken };
