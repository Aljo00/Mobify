const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Address = require("../../models/addressSchema");
const cloudinary = require("../../config/cloudinary");
const { profile } = require("console");

const load_page404 = async (req, res) => {
  try {
    res.status(404).render("user/page404");
  } catch (error) {
    res.redirect("/page404");
  }
};

const loadAccountPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.user.id;
    const userData = user ? await User.findById(user).lean() : null;

    if (userData) {
      const userAddress = await Address.findOne({ userId: user }).lean();
      userData.address = userAddress ? userAddress.address : [];
    }

    // const cartItemCount = userData.items.length;
    const usercart = await cart.findOne({ userId: user });
    const cartItemCount = usercart.items.length;

    res.status(200).render("user/account", {
      brand: brand,
      user: userData,
      cartItemCount: cartItemCount,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

const loadEditAccountPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.user.id;

    const userData = user ? await User.findById(user).lean() : null;

    // const cartItemCount = userData.items.length;
    const usercart = await cart.findOne({ userId: user });
    const cartItemCount = usercart.items.length;

    res.status(200).render("user/editAccount", {
      brand: brand,
      user: userData,
      cartItemCount: cartItemCount,
    });
  } catch (error) {
    console.error("Error loading editing address page:", error);
    res.redirect("/page404");
  }
};

const editAccount = async (req, res) => {
  try {
   const { name, dob, email, altEmail, phone, altPhone } = req.body;
   const user = req.user.id;

   // Handle file upload to Cloudinary
   let profileImageUrl = null;
   console.log(req.file)
   if (req.file) {
     // Upload image to Cloudinary
     const result = await cloudinary.uploader.upload(req.file.path, {
       folder: "profile_images", // specify the folder in Cloudinary
     });

     // Get the URL of the uploaded image
     profileImageUrl = result.secure_url;
   }

   console.log(profileImageUrl)

   const updateFields = {
     name,
     dob,
     email,
     altEmail,
     phone,
     altPhone,
   };

   if (profileImageUrl) {
     updateFields.profileImage = profileImageUrl;
   }

   const a = await User.updateOne({ _id: user }, { $set: updateFields });

   console.log(a)

   res
     .status(200)
     .json({ success: true, message: "Account updated successfully" });
  } catch (error) {
    console.error("Error editing account page:", error);
    res.redirect("/page404");
  }
};

const loadAddressPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.user.id;

    let userData = null;

    if (user) {
      // Fetch user data
      userData = await User.findById(user).lean();

      // Fetch address details
      const userAddress = await Address.findOne({ userId: user }).lean();

      // Add address details to userData
      if (userAddress && userAddress.address.length > 0) {
        userData.address = userAddress.address; // Detailed address objects
      } else {
        userData.address = []; // Empty array if no addresses exist
      }
    }
    const usercart = await cart.findOne({ userId: user });
    const cartItemCount = usercart.items.length;

    res.render("user/address", {
      brand: brand,
      user: userData, // Pass updated userData with detailed address
      cartItemCount: cartItemCount,
    });
  } catch (error) {
    console.error("Error loading address page:", error);
    res.redirect("/page404");
  }
};

const loadAddAddressPage = async (req, res) => {
  try {
    const brand = await Brand.find({});

    const userId = req.user.id;

    const userCart = await cart
      .findOne({ userId })
      .populate({
        path: "items.ProductId", // Populate ProductId
        select: "productName productImage", // Select only the required fields
      })
      .lean();

    const userData = userId ? await User.findById(userId) : null;

    const cartItemCount = userCart.items.length;
    res.render("user/add-address", {
      brand: brand,
      user: userData,
      cartItemCount: cartItemCount,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page404");
  }
};

const addNewAddress = async (req, res) => {
  try {
    const {
      addressType,
      houseName,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;
    const userId = req.user.id;

    const userAddress = await Address.findOne({ userId });

    if (userAddress) {
      // If address already exists, update it
      userAddress.address.push({
        addressType,
        houseName,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      });
      await userAddress.save();
    } else {
      // If no address exists, create a new one
      const newAddress = new Address({
        userId,
        address: [
          {
            addressType,
            houseName,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
          },
        ],
      });
      await newAddress.save();
    }

    res.redirect("/addresses");
  } catch (error) {
    console.error("Error adding new address:", error);
    res.redirect("/page404");
  }
};

const loadEditAddressPage = async (req, res) => {
  try {
    const brand = await Brand.find({});

    const userId = req.user.id;

    const userData = userId ? await User.findById(userId) : null;

    const usercart = await cart.findOne({ userId: userId });
    const cartItemCount = usercart.items.length;

    const { id } = req.params;

    const address = await Address.findOne(
      { "address._id": id },
      { "address.$": 1 }
    );
    res.render("user/edit-address", {
      address: address,
      user: userData,
      cartItemCount: cartItemCount,
      brand: brand,
    });
  } catch (error) {
    console.error("Error loading editing address page:", error);
    res.redirect("/page404");
  }
};

const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      addressType,
      houseName,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;

    console.log(req.body, id);

    const result = await Address.updateOne(
      { "address._id": id }, // Find the address by its _id
      {
        $set: {
          "address.$.addressType": addressType,
          "address.$.houseName": houseName,
          "address.$.city": city,
          "address.$.landMark": landMark,
          "address.$.state": state,
          "address.$.pincode": pincode,
          "address.$.phone": phone,
          "address.$.altPhone": altPhone,
        },
      }
    );

    res
      .status(200)
      .json({ success: true, message: "Address updated successfully" });
  } catch (error) {
    console.error("Error editing address:", error);
    res.redirect("/page404");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Address.updateOne(
      { "address._id": id },
      { $pull: { address: { _id: id } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send("Address not found");
    }

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error Deleting address:", error);
    res.redirect("/page404"); // Redirect in case of error
  }
};

const loadForgotPasswordPage = async (req, res) => {
  try {
    res.render("user/forgotPassword");
  } catch (error) {
    console.error("Error adding new address:", error);
    res.redirect("/page404");
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    // Find the user by email
    const findEmail = await User.findOne({ email: email });
    if (!findEmail) {
      return res.render("user/forgotPassword", { message: "No email found" });
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash the token to store in the database
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token and expiration time in the user's record
    findEmail.resetPasswordToken = hashedToken;
    findEmail.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // Token valid for 15 minutes

    // Save the updated user document
    await findEmail.save();

    // Generate the reset password link
    const resetLink = `http://localhost:3000/reset-password/${resetToken}`;

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
      // Send the reset password email
      await transporter.sendMail({
        from: `"Mobify Support" <${process.env.NODEMAILER_EMAIL}>`,
        to: email,
        subject: "Reset Your Password - Mobify",
        html: `
            <h1>Reset Your Password</h1>
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="${resetLink}" target="_blank">Reset Password</a>
            <p>If you didn't request this, please ignore this email.</p>
            <p>This link will expire in <strong>15 minutes</strong>.</p>
            <br>
            <p>Thank you, <br> Mobify Team</p>
          `,
      });

      res.json({
        success: true,
        message: "Reset password link sent to your email.",
      });
    } catch (error) {
      console.error("Error sending email:", error.message);
      res
        .status(500)
        .json({ success: false, message: "Failed to send email." });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.redirect("/page404");
  }
};

const loadResetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with the stored hashed token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the user by the hashed token and check if the token is expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Token should not be expired
    });

    if (!user) {
      return res.status(400).send("Invalid or expired reset token.");
    }

    // Render the reset password form
    res.render("user/resetPassword");
  } catch (error) {
    console.error("Error adding new address:", error);
    res.redirect("/page404");
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    // Hash the token to compare with the stored hashed token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find the user by the hashed token and check if the token is expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).send("Invalid or expired reset token.");
    }

    // Hash the new password before saving it
    user.password = await bcrypt.hash(password, 10); // Use bcrypt for password hashing

    // Clear the reset token and expiration
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // Save the updated user
    await user.save();

    res.send("Password has been successfully reset.");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).send("Server error.");
  }
};

module.exports = {
  load_page404,
  loadAccountPage,
  loadAddressPage,
  loadAddAddressPage,
  addNewAddress,
  loadForgotPasswordPage,
  verifyEmail,
  loadResetPassword,
  resetPassword,
  loadEditAddressPage,
  deleteAddress,
  updateAddress,
  loadEditAccountPage,
  editAccount,
};
