const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Wallet = require("../../models/walletSchema");
const sendMail = require("../../helpers/sendMail");
const {
  returnRequestApproved,
  returnRequestRejected,
  returnCompleted,
} = require("../../helpers/returnEmailTemplates");

const getOrdersPage = async (req, res) => {
  try {
    const { status, payment, page: pageStr } = req.query;
    const page = parseInt(pageStr) || 1;
    const limit = 6;
    let query = {};

    // Build query based on both filters
    if (status && status !== "all") {
      query["orderedItems.status"] = status;
    }
    if (payment && payment !== "all") {
      query["paymentMethod"] = payment;
    }

    // Get ALL orders with return requests, regardless of pagination or filters
    const returnRequestCount = await Order.aggregate([
      { $unwind: "$orderedItems" },
      { $match: { "orderedItems.status": "Return Request" } },
      { $count: "total" },
    ]);

    const totalReturnRequests = returnRequestCount[0]?.total || 0;

    // Rest of the pagination and order fetching logic
    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(query)
      .populate("userId", "name")
      .populate("orderedItems.product", "productName price _id")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    console.log("Found orders:", orders.length); // Debug log

    const transformedOrders = orders.flatMap((order) =>
      order.orderedItems.map((item) => ({
        orderId: order.orderId,
        customerName:
          order.userId && order.userId.name ? order.userId.name : "Unknown",
        productId: item.product ? item.product._id : null,
        productName: item.product
          ? item.product.productName
          : "Unknown Product",
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        itemStatus: item.status,
        orderStatus: order.status,
        totalAmount: order.FinalAmount,
        isReturnRequest: item.status === "Return Request",
        paymentMethod: order.paymentMethod, // Add payment method
        ram: item.ram, // Add ram
        storage: item.storage, // Add storage
      }))
    );

    // Get ALL return requests regardless of pagination or current filter
    const allReturnRequests = await Order.find({
      "orderedItems.status": "Return Request",
    })
      .populate("userId", "name")
      .populate("orderedItems.product", "productName price _id");

    // Transform return requests separately
    const returnRequestsData = allReturnRequests.flatMap((order) =>
      order.orderedItems
        .filter((item) => item.status === "Return Request")
        .map((item) => ({
          orderId: order.orderId,
          customerName: order.userId?.name || "Unknown",
          productId: item.product?._id,
          productName: item.product?.productName || "Unknown Product",
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
          itemStatus: item.status,
          paymentMethod: order.paymentMethod, // Add payment method
        }))
    );

    res.render("admin/orders", {
      orders: transformedOrders,
      returnRequests: totalReturnRequests, // Use total return requests here
      returnRequestsData: returnRequestsData, // Add this new data
      currentFilter: status || "all",
      paymentFilter: payment || "all",
      pagination: {
        page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1,
        lastPage: totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const updateStatus = async (req, res) => {
  const { orderId, productId, status } = req.body;

  try {
    const order = await Order.findOne({ orderId })
      .populate("userId") // Fully populate user to get all fields
      .populate("orderedItems.product");

    if (!order || !order.userId) {
      console.error("Order or user not found");
      return res.status(404).send("Order not found");
    }

    // Find the user separately to ensure we have email
    const user = await User.findById(order.userId._id);
    if (!user || !user.email) {
      console.error("User email not found");
      return res.status(404).send("User email not found");
    }

    const orderedItem = order.orderedItems.find(
      (item) => item.product._id.toString() === productId
    );

    if (!orderedItem) {
      console.error("Product not found in order");
      return res.status(404).send("Product not found in order");
    }

    // Validate status transition
    const validTransition = isValidStatusTransition(orderedItem.status, status);
    if (!validTransition) {
      console.error("Invalid status transition");
      return res.status(400).send("Invalid status transition");
    }

    // Create email details with verified user information
    const emailDetails = {
      customerName: user.name,
      orderId: order.orderId,
      productName: orderedItem.productName || orderedItem.product.productName,
      totalPrice: orderedItem.totalPrice,
    };

    // Log for verification
    console.log("Preparing to send email to:", user.email);

    // Send appropriate email based on status using verified user email
    let emailSent = false;
    switch (status) {
      case "Return Approved":
        emailSent = await sendMail(
          user.email.trim(), // Ensure clean email address
          "Return Request Approved",
          returnRequestApproved(emailDetails)
        );
        break;

      case "Return Rejected":
        emailSent = await sendMail(
          user.email.trim(), // Ensure clean email address
          "Return Request Update",
          returnRequestRejected(emailDetails)
        );
        break;

      case "Returned":
        await processReturn(order, orderedItem);
        emailSent = await sendMail(
          user.email.trim(), // Ensure clean email address
          "Return Completed - Refund Processed",
          returnCompleted(emailDetails)
        );
        break;
    }

    // Log email status
    console.log("Email sent status:", emailSent);

    orderedItem.status = status;
    await order.save();
    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};

// Add new helper function to validate status transitions
const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    Pending: ["Processing", "Shipped", "Delivered", "Cancelled"], // Allow direct transition to any state
    Processing: ["Shipped", "Delivered", "Cancelled"], // Allow shipping, delivery, or cancellation
    Shipped: ["Delivered", "Cancelled"], // Allow delivery or cancellation
    Delivered: ["Return Request"], // Only allow return request
    "Return Request": ["Return Approved", "Return Rejected"], // Return handling
    "Return Approved": ["Returned"], // Can only move to returned
    "Return Rejected": [], // No further transitions
    Returned: [], // No further transitions
    Cancelled: [], // No further transitions
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

const processReturn = async (order, orderedItem) => {
  try {
    // Find the specific ordered item in the original order
    const originalOrderedItem = order.orderedItems.find(
      (item) =>
        item.product._id.toString() === orderedItem.product._id.toString()
    );

    if (!originalOrderedItem) {
      throw new Error("Original ordered item not found");
    }

    // Update product quantity
    const product = await Product.findById(orderedItem.product._id); // Fix: Use _id from populated product
    if (!product) {
      throw new Error("Product not found");
    }

    // Debug logs
    console.log("Processing return for product:", product.productName);
    console.log("Current product combos:", product.combos);
    console.log("Order item details:", {
      ram: originalOrderedItem.RAM, // Changed from ram to RAM
      storage: originalOrderedItem.Storage, // Changed from storage to Storage
      quantity: originalOrderedItem.quantity,
    });

    // Find the matching combo using the original order item details
    const comboIndex = product.combos.findIndex(
      (combo) =>
        combo.ram === originalOrderedItem.RAM && // Changed from ram to RAM
        combo.storage === originalOrderedItem.Storage // Changed from storage to Storage
    );

    if (comboIndex !== -1) {
      // Update the quantity
      product.combos[comboIndex].quantity += originalOrderedItem.quantity;
      console.log(
        "Updated combo quantity:",
        product.combos[comboIndex].quantity
      );

      await product.save();
      console.log("Product saved successfully");
    } else {
      console.error(
        "No matching combo found for RAM:",
        originalOrderedItem.RAM,
        "Storage:",
        originalOrderedItem.Storage
      );
      throw new Error("No matching product combo found");
    }

    // Process wallet refund
    if (
      order.paymentMethod === "razorpay" ||
      order.paymentMethod === "wallet"
    ) {
      let wallet = await Wallet.findOne({ user: order.userId });

      if (!wallet) {
        wallet = new Wallet({
          user: order.userId,
          balance: 0,
          transactions: [],
        });
      }

      // Add refund amount to wallet
      wallet.balance += orderedItem.totalPrice;
      wallet.transactions.push({
        type: "credit",
        amount: orderedItem.totalPrice,
        description: `Refund for cancelled order ${order.orderId}`,
      });

      await wallet.save();
    }
  } catch (error) {
    console.error("Error processing return:", error);
    console.error("Error details:", {
      productId: orderedItem.product._id,
      RAM: originalOrderedItem?.RAM, // Changed from ram to RAM
      Storage: originalOrderedItem?.Storage, // Changed from storage to Storage
      quantity: originalOrderedItem?.quantity,
    });
    throw error;
  }
};

module.exports = {
  getOrdersPage,
  updateStatus,
  processReturn,
};
