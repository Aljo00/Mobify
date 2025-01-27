const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema");
const cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");

const getOrdersPage = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name")
      .populate("orderedItems.product", "productName price _id")
      .sort({ createdAt: -1 });

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
      }))
    );
    res.render("admin/orders", { orders: transformedOrders });
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

const updateStatus = async (req, res) => {
  const { orderId, productId, status } = req.body;

  console.log("Order ID:", orderId);
  console.log("Product ID:", productId);
  console.log("New Status:", status);

  try {
    const order = await Order.findOne({ orderId });

    if (!order) {
      console.error("Order not found");
      return res.status(404).send("Order not found");
    }

    const product = order.orderedItems.find(
      (item) => item.product.toString() === productId
    );

    if (!product) {
      console.error("Product not found in order");
      return res.status(404).send("Product not found in order");
    }

    product.status = status;

    await order.save();
    console.log("Order updated successfully");

    res.redirect("/admin/orders");
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = {
  getOrdersPage,
  updateStatus,
};
