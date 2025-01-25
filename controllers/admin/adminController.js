const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");

const Order = require("../../models/orderSchema");

const mongoose = require("mongoose");

const { generateToken } = require("../../config/JWT");

//this is module is checking the hashpassword of the admin.
const bcrypt = require("bcrypt");

//This page is used for rendering error page whenever a error will found it will render there.
const show_error = async (req, res) => {
  return res.render("admin/error");
};

//This is for rendering the admin Login Page.
const loadLogin = async (req, res) => {
  try {
    console.log("Admin Login page rendered successfully");
    console.log("==========");

    return res.render("admin/admin-login");
  } catch (error) {
    console.log("Admin Login page rendering Failed:--", error.message);
    console.log("==========");

    res.redirect("/admin/error");
  }
};

//This controller check the admin entered password and email is correct or not.
const verifyAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`Admin Entered password  ${password} and userName ${email}`);
    console.log("==========");

    const findAdmin = await User.findOne({ email, isAdmin: true });

    if (findAdmin) {
      const passwordMatch = await bcrypt.compare(password, findAdmin.password);

      if (passwordMatch) {
        const token = generateToken(findAdmin);

        res.cookie("adminAuth", token, {
          httpOnly: true, // Prevent JavaScript access
          secure: process.env.NODE_ENV === "production", // Use HTTPS in production
          maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
        });

        console.log(
          "Admin Entered password and userName is correct and redirected to the dashboard"
        );
        console.log("==========");
        return res.redirect("/admin/dashboard");
      } else {
        console.log("Admin Entered password Incorrect");
        console.log("==========");
        return res.render("admin/admin-login", {
          message: "Incorrect Password",
        });
      }
    } else {
      console.log("Admin Entered userName is Incorrect");
      console.log("==========");
      return res.render("admin/admin-login", { message: "No user found" });
    }
  } catch (error) {
    console.log(
      "Admin Entered password and userName Found an error ",
      error.message
    );
    console.log("==========");
    res.render("admin/admin-login", {
      message: "Login Failed! Please try again",
    });
  }
};

const loadDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Calculate total revenue from all orders
    const revenueResult = await Order.aggregate([
      {
        $match: {
          orderStatus: { $ne: "Cancelled" }, // Exclude cancelled orders
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalRevenue =
      revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Get monthly revenue and order counts
    const monthlyData = await Order.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    // Create default data for last 6 months
    const defaultMonths = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      defaultMonths.push({
        _id: {
          month: d.getMonth() + 1,
          year: d.getFullYear(),
        },
        count: 0,
        revenue: 0,
      });
    }

    // Merge real data with defaults
    const finalMonthlyData = defaultMonths.map((defaultItem) => {
      const match = monthlyData.find(
        (item) =>
          item._id.month === defaultItem._id.month &&
          item._id.year === defaultItem._id.year
      );
      return match || defaultItem;
    });

    // Format data for the chart
    const labels = finalMonthlyData.map((item) => {
      const month = new Date(item._id.year, item._id.month - 1).toLocaleString(
        "default",
        { month: "long" }
      );
      return `${month} ${item._id.year}`;
    });

    const orderCounts = finalMonthlyData.map((item) => item.count);
    const revenues = finalMonthlyData.map((item) => item.revenue);

    // Get current week's daily orders with revenue
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - 6); // Last 7 days

    const weeklyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfWeek },
          orderStatus: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Create daily data array with defaults for missing days
    const weeklyData = [];
    const weeklyRevenue = [];
    const weeklyLabels = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = weeklyOrders.find((order) => order._id.date === dateStr);

      weeklyLabels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
      weeklyData.push(dayData ? dayData.count : 0);
      weeklyRevenue.push(dayData ? dayData.revenue : 0);
    }

    // Get recent orders with correct population field
    const orders = await Order.find()
      .populate('userId', 'name')  // Changed from 'user' to 'userId'
      .sort({ createdAt: -1 })
      .limit(5);

    // Get today's orders and revenue with local time
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          orderStatus: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: {
            hour: {
              $hour: {
                $add: ["$createdAt", 5.5 * 60 * 60 * 1000] // Add 5:30 hours for IST
              }
            }
          },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.hour": 1 } },
    ]);

    // Create hourly data array with proper time formatting
    const todayData = [];
    const todayRevenue = [];
    const todayLabels = [];

    for (let i = 0; i < 24; i++) {
      const hourData = todayOrders.find(order => order._id.hour === i);
      const hourStr = i.toString().padStart(2, '0');
      todayLabels.push(`${hourStr}:00`);
      todayData.push(hourData ? hourData.count : 0);
      todayRevenue.push(hourData ? hourData.revenue : 0);
    }

    // Get orders for different time periods
    const todaysOrders = await Order.find({
      createdAt: { $gte: todayStart }
    })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

    const weeklyOrdersList = await Order.find({
      createdAt: { $gte: startOfWeek }
    })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

    const monthlyOrdersList = await Order.find({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1)
      }
    })
    .populate('userId', 'name')
    .sort({ createdAt: -1 });

    return res.render("admin/dashboard", {
      totalRevenue,
      totalProducts,
      totalUsers,
      totalOrders,
      orders, // Add this line
      orderChartLabels: JSON.stringify(labels),
      orderChartData: JSON.stringify(orderCounts),
      orderChartRevenue: JSON.stringify(revenues),
      weeklyLabels: JSON.stringify(weeklyLabels),
      weeklyData: JSON.stringify(weeklyData),
      weeklyRevenue: JSON.stringify(weeklyRevenue),
      todayLabels: JSON.stringify(todayLabels),
      todayData: JSON.stringify(todayData),
      todayRevenue: JSON.stringify(todayRevenue),
      todaysOrders: JSON.stringify(todaysOrders),
      weeklyOrdersList: JSON.stringify(weeklyOrdersList),
      monthlyOrdersList: JSON.stringify(monthlyOrdersList),
    });
  } catch (error) {
    console.log("Admin Dashboard Rendered Incomplete because ", error.message);
    console.log("==========");
    res.redirect("/admin/error");
  }
};

const logout = async (req, res) => {
  try {
    res.clearCookie("adminAuth", {
      httpOnly: true, // Ensure the cookie is not accessible via JavaScript
      secure: process.env.NODE_ENV === "production", // Use HTTPS in production
      sameSite: "strict", // Ensure the cookie is sent only with same-site requests
    });

    console.log("Admin LogOut succesfully completed");
    console.log("==========");
    res.redirect("/admin/login");
  } catch (error) {
    console.log("Error found: ", error.message);
    res.redirect("/admin/error");
  }
};

module.exports = {
  loadLogin,
  verifyAdminLogin,
  loadDashboard,
  show_error,
  logout,
};
