const nodemailer = require("nodemailer");
const env = require("dotenv").config();
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const cart = require("../../models/cartSchema");
const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Address = require("../../models/addressSchema");
const cloudinary = require("../../config/cloudinary");
// const { profile } = require("console");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const Product = require("../../models/productSchema");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const load_page404 = async (req, res) => {
  try {
    res.status(404).render("user/page404");
  } catch (error) {
    res.redirect("/page404");
  }
};

// Overall Summary:
// This section handles the account-related actions for the user. It consists of three controllers:
// 1. loadAccountPage - Loads the user's account section.
// 2. loadEditAccountPage - Loads the edit account page for modifying user details.
// 3. editAccount - Saves the updated user details to the database after editing.

// Controller: loadAccountPage
// Description: This controller is responsible for loading the user's account section. It retrieves and displays
// the user's profile details, settings, and other relevant information in the account dashboard.
const loadAccountPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isBlocked: false });
    const user = req.user.id;
    const userData = user ? await User.findById(user).lean() : null;
    if (!userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
    }

    if (userData) {
      const userAddress = await Address.findOne({ userId: user }).lean();
      userData.address = userAddress ? userAddress.address : [];
    }

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

// Controller: loadEditAccountPage
// Description: This controller loads the edit account page where the user can modify their personal information,
// such as name, email, password, etc. It provides the user with a form pre-filled with their current account details.

const loadEditAccountPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.user.id;

    const userData = user ? await User.findById(user).lean() : null;
    if (!userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
    }

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

// Controller: editAccount
// Description: This controller handles the process of saving the updated account details to the database.
// It takes the edited data from the user and updates the corresponding fields in the user's account record.

const editAccount = async (req, res) => {
  try {
    const { name, dob, email, altEmail, phone, altPhone } = req.body;
    const user = req.user.id;

    let profileImageUrl = null;
    console.log(req.file);
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
      });

      profileImageUrl = result.secure_url;
    }

    console.log(profileImageUrl);

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

    await User.updateOne({ _id: user }, { $set: updateFields });

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
      // Generate initials if no profile picture exists
      if (!userData.profileImage) {
        const name = userData.name || "";
        userData.initials = name
          .replace(/\s+/g, "") // Remove all spaces in the name
          .slice(0, 2) // Take the first two characters
          .toUpperCase(); // Convert to uppercase
      }

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
    // Generate initials if no profile picture exists
    if (!userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name
        .replace(/\s+/g, "") // Remove all spaces in the name
        .slice(0, 2) // Take the first two characters
        .toUpperCase(); // Convert to uppercase
    }

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

const loadOrdersPage = async (req, res) => {
  try {
    const brand = await Brand.find({ isBlocked: false });
    const user = req.user.id;
    const userData = user ? await User.findById(user).lean() : null;

    // Pagination and filter parameters
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const filterStatus = req.query.status || "all";

    // Generate initials if no profile picture exists
    if (!userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
    }

    const usercart = await cart.findOne({ userId: user });
    const cartItemCount = usercart.items.length;

    // Build query based on filter
    let query = { userId: user };
    if (filterStatus !== "all") {
      query["orderedItems.status"] = filterStatus;
    }

    // Get total count of filtered orders for pagination
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch paginated and filtered orders
    const orders = await Order.find(query)
      .populate("orderedItems.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Fetch the address for each order
    for (let order of orders) {
      const userAddress = await Address.findOne({ userId: user }).lean();
      order.address = userAddress
        ? userAddress.address.find(
            (addr) => addr._id.toString() === order.address.toString()
          )
        : "No address found";
      order.orderedItems.forEach((item) => {
        item.status = item.status || "Pending";
      });
    }

    res.render("user/orders", {
      orders,
      cartItemCount,
      brand,
      user: userData,
      filterStatus,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
      },
    });
  } catch (error) {
    console.error("Error loading orders page:", error);
    res.redirect("/page404");
  }
};

const loadOrdersDetailPage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId } = req.query;

    console.log(orderId, productId);

    const brand = await Brand.find({ isBlocked: false });
    const user = req.user.id;
    const userData = user ? await User.findById(user).lean() : null;

    if (userData && !userData.profileImage) {
      const name = userData.name || "";
      userData.initials = name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
    }

    const usercart = await cart.findOne({ userId: user });
    const cartItemCount = usercart ? usercart.items.length : 0;

    const order = await Order.findOne({ orderId }).populate(
      "orderedItems.product"
    );
    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Find the specific product in the ordered items
    const clickedProduct = order.orderedItems.find(
      (item) => item._id.toString() === productId
    );
    if (!clickedProduct) {
      return res.status(404).send("Product not found in this order");
    }

    res.render("user/orderDetails", {
      order,
      cartItemCount,
      brand,
      user: userData,
      clickedProduct, // Send the clicked product to the view
    });
  } catch (error) {
    console.error("Error loading orders page:", error);
    res.redirect("/page404");
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Find the order
    const order = await Order.findById(orderId).populate(
      "orderedItems.product"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate if order belongs to user
    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to cancel this order",
      });
    }

    // Check if all items can be cancelled
    const canCancel = order.orderedItems.every(
      (item) => !["Shipped", "Delivered", "Cancelled"].includes(item.status)
    );

    if (!canCancel) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot cancel order - some items are already shipped, delivered, or cancelled",
      });
    }

    // Update product quantities
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product._id);

      const comboIndex = product.combos.findIndex(
        (combo) => combo.ram === item.RAM && combo.storage === item.Storage
      );

      if (comboIndex !== -1) {
        product.combos[comboIndex].quantity += item.quantity;
        await product.save();
      }
    }

    // Update order status
    order.orderedItems.forEach((item) => {
      item.status = "Cancelled";
    });
    await order.save();

    // Only process refund for non-COD orders
    if (order.paymentMethod !== "cod") {
      let wallet = await Wallet.findOne({ user: userId });

      if (!wallet) {
        wallet = new Wallet({
          user: userId,
          balance: 0,
          transactions: [],
        });
      }

      // Add refund transaction
      wallet.balance += order.FinalAmount;
      wallet.transactions.push({
        type: "credit",
        amount: order.FinalAmount,
        description: `Refund for cancelled order #${order.orderId} (${order.paymentMethod})`,
      });

      await wallet.save();

      res.status(200).json({
        success: true,
        message: "Order cancelled and refund initiated successfully",
      });
    } else {
      res.status(200).json({
        success: true,
        message: "Order cancelled successfully",
      });
    }
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({
      success: false,
      message:
        error.message ||
        "An unexpected error occurred while cancelling the order",
    });
  }
};

const initiateReturn = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.user.id;

    if (!orderId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Order ID and reason are required",
      });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Validate if order belongs to user
    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to return this order",
      });
    }

    // Check if order is delivered and within return window (e.g., 7 days)
    const deliveredItem = order.orderedItems.find(
      (item) => item.status === "Delivered"
    );
    if (!deliveredItem) {
      return res.status(400).json({
        success: false,
        message: "Order must be delivered to initiate return",
      });
    }

    const deliveryDate = new Date(order.updatedAt);
    const today = new Date();
    const daysSinceDelivery = Math.floor(
      (today - deliveryDate) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceDelivery > 7) {
      return res.status(400).json({
        success: false,
        message: "Return window has expired (7 days from delivery)",
      });
    }

    // Update order status to Return Request
    order.orderedItems.forEach((item) => {
      if (item.status === "Delivered") {
        item.status = "Return Request";
      }
    });

    // Save return reason
    order.returnReason = reason;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({
      success: false,
      message:
        error.message ||
        "An unexpected error occurred while processing return request",
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // First find the order and populate necessary fields
    const order = await Order.findById(orderId)
      .populate("orderedItems.product")
      .populate("userId", "name email")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Check authorization
    if (order.userId._id.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    // Fetch address details
    const userAddress = await Address.findOne({ userId });
    if (!userAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Address not found" });
    }

    const deliveryAddress = userAddress.address.find(
      (addr) => addr._id.toString() === order.address.toString()
    );

    if (!deliveryAddress) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery address not found" });
    }

    // Initialize PDF document
    const doc = new PDFDocument({
      margin: 50,
      size: "A4",
      layout: "portrait",
    });

    // Setup document
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order.orderId}.pdf`
    );
    doc.pipe(res);

    // Add some nice graphics at the top
    doc.rect(0, 0, doc.page.width, 150).fill("#4a90e2");

    // White circle behind logo
    doc.circle(doc.page.width / 2, 75, 30).fill("#ffffff");

    // Logo
    doc
      .fontSize(40)
      .fillColor("#4a90e2")
      .text("M", doc.page.width / 2 - 15, 55);

    // Company name in white
    doc
      .fontSize(30)
      .fillColor("#ffffff")
      .text("MOBIFY", doc.page.width / 2 - 50, 20);

    // Slogan
    doc
      .fontSize(12)
      .text("Your Trusted Mobile Partner", doc.page.width / 2 - 70, 110);

    // Invoice title with stylish background
    doc.rect(50, 170, 495, 40).fill("#f8f9fa");
    doc.fontSize(20).fillColor("#333333").text("TAX INVOICE", 270, 180);

    // Add invoice details in a box
    doc.rect(50, 230, 495, 80).lineWidth(1).stroke("#dddddd");

    doc
      .fontSize(10)
      .text(`Invoice No: #${order.orderId}`, 60, 240)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 60, 255)
      .text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 60, 270)
      .text(`Order Status: ${order.orderedItems[0].status}`, 60, 285);

    // Add company info box
    doc.rect(50, 330, 240, 100).fill("#f8f9fa");
    doc
      .fillColor("#333333")
      .fontSize(12)
      .text("From:", 60, 340)
      .fontSize(10)
      .text("Mobify Technologies Pvt. Ltd.", 60, 360)
      .text("123 Tech Street, Digital Plaza", 60, 375)
      .text("Bangalore, Karnataka - 560001", 60, 390)
      .text("GST: 29ABCDE1234F1Z5", 60, 405);

    // Add customer info box
    doc.rect(305, 330, 240, 100).fill("#f8f9fa");
    doc
      .fillColor("#333333")
      .fontSize(12)
      .text("Bill To:", 315, 340)
      .fontSize(10)
      .text(`${order.userId.name}`, 315, 360)
      .text(`${deliveryAddress.houseName}`, 315, 375)
      .text(`${deliveryAddress.city}, ${deliveryAddress.state}`, 315, 390)
      .text(`Phone: ${deliveryAddress.phone}`, 315, 405);

    // Items table header with gradient
    const tableTop = 450;
    doc.rect(50, tableTop, 495, 30).fill("#4a90e2");

    doc
      .fillColor("#ffffff")
      .text("Product", 60, tableTop + 10)
      .text("Specifications", 220, tableTop + 10)
      .text("Qty", 340, tableTop + 10)
      .text("Price", 400, tableTop + 10)
      .text("Total", 470, tableTop + 10);

    // Items table rows with alternating colors
    let yPos = tableTop + 30;
    order.orderedItems.forEach((item, i) => {
      doc.rect(50, yPos, 495, 25).fill(i % 2 === 0 ? "#ffffff" : "#f8f9fa");

      doc
        .fillColor("#333333")
        .text(item.product.productName, 60, yPos + 7, { width: 150 })
        .text(`${item.RAM}GB RAM, ${item.Storage}GB`, 220, yPos + 7)
        .text(item.quantity.toString(), 340, yPos + 7)
        .text(`₹${Number(item.price).toFixed(2)}`, 400, yPos + 7)
        .text(`₹${Number(item.totalPrice).toFixed(2)}`, 470, yPos + 7);

      yPos += 25;
    });

    // Totals section with box
    doc.rect(305, yPos + 20, 240, 100).fill("#f8f9fa");

    const subtotal = order.orderedItems.reduce(
      (sum, item) => sum + Number(item.totalPrice),
      0
    );
    const discount = subtotal - Number(order.FinalAmount);

    doc
      .fontSize(10)
      .text("Subtotal:", 315, yPos + 30)
      .text(`₹${subtotal.toFixed(2)}`, 485, yPos + 30, { align: "right" })
      .text("Discount:", 315, yPos + 50)
      .text(`₹${discount.toFixed(2)}`, 485, yPos + 50, { align: "right" })
      .fontSize(12)
      .fillColor("#4a90e2")
      .text("Final Amount:", 315, yPos + 80)
      .text(`₹${Number(order.FinalAmount).toFixed(2)}`, 485, yPos + 80, {
        align: "right",
      });

    // Footer with terms and QR code
    const footerTop = yPos + 150;
    doc.rect(50, footerTop, 495, 80).fill("#f8f9fa");

    doc
      .fontSize(8)
      .fillColor("#666666")
      .text("Terms & Conditions:", 60, footerTop + 10)
      .text("1. All prices include GST", 60, footerTop + 25)
      .text("2. Returns accepted within 7 days of delivery", 60, footerTop + 35)
      .text("3. Warranty as per manufacturer terms", 60, footerTop + 45);

    // Add a decorative bottom border
    doc.rect(0, doc.page.height - 20, doc.page.width, 20).fill("#4a90e2");

    // Centered text at the bottom
    doc
      .fontSize(8)
      .fillColor("#ffffff")
      .text("Thank you for shopping with Mobify!", 0, doc.page.height - 15, {
        align: "center",
      });

    // End the document
    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invoice: " + error.message,
    });
  }
};

try {
} catch (error) {
  console.error(error);
  res.status(500).send("Server error");
}

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
  loadOrdersPage,
  loadOrdersDetailPage,
  cancelOrder,
  initiateReturn,
  downloadInvoice,
};
