const User = require("../../models/userSchema");

const Product = require("../../models/productSchema");

const Order = require("../../models/orderSchema");

const mongoose = require("mongoose");

const { generateToken } = require("../../config/JWT");

//this is module is checking the hashpassword of the admin.
const bcrypt = require("bcrypt");

const Excel = require("exceljs");
const PDFDocument = require("pdfkit");

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
      .populate("userId", "name") // Changed from 'user' to 'userId'
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
                $add: ["$createdAt", 5.5 * 60 * 60 * 1000], // Add 5:30 hours for IST
              },
            },
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
      const hourData = todayOrders.find((order) => order._id.hour === i);
      const hourStr = i.toString().padStart(2, "0");
      todayLabels.push(`${hourStr}:00`);
      todayData.push(hourData ? hourData.count : 0);
      todayRevenue.push(hourData ? hourData.revenue : 0);
    }

    // Get orders for different time periods
    const todaysOrders = await Order.find({
      createdAt: { $gte: todayStart },
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    const weeklyOrdersList = await Order.find({
      createdAt: { $gte: startOfWeek },
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    const monthlyOrdersList = await Order.find({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    })
      .populate("userId", "name")
      .sort({ createdAt: -1 });

    // Add these statistics calculations
    const paymentStats = {
      COD: await Order.countDocuments({
        paymentMethod: "cod",
        "orderedItems.status": { $ne: "Cancelled" },
      }),
      Online: await Order.countDocuments({
        paymentMethod: "razorpay",
        "orderedItems.status": { $ne: "Cancelled" },
      }),
      Wallet: await Order.countDocuments({
        paymentMethod: "wallet",
        "orderedItems.status": { $ne: "Cancelled" },
      }),
    };

    // Make sure payment stats exist
    console.log("Payment Stats:", paymentStats); // For debugging

    const salesStats = {
      deliveredOrders: await Order.countDocuments({
        "orderedItems.status": "Delivered",
      }),
      pendingOrders: await Order.countDocuments({
        "orderedItems.status": "Pending",
      }),
      processingOrders: await Order.countDocuments({
        "orderedItems.status": "Processing",
      }),
      shippedOrders: await Order.countDocuments({
        "orderedItems.status": "Shipped",
      }),
      cancelledOrders: await Order.countDocuments({
        "orderedItems.status": "Cancelled",
      }),
      returnRequestedOrders: await Order.countDocuments({
        "orderedItems.status": "Return Request",
      }),
      returnApprovedOrders: await Order.countDocuments({
        "orderedItems.status": "Return Approved",
      }),
      returnRejectedOrders: await Order.countDocuments({
        "orderedItems.status": "Return Rejected",
      }),
      returnedOrders: await Order.countDocuments({
        "orderedItems.status": "Returned",
      }),
    };

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
      paymentStats,
      salesStats,
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

const downloadReport = async (req, res) => {
  try {
    const { type, range, start, end } = req.query;
    const today = new Date();
    let startDate, endDate;

    // Normalize the range string
    const normalizedRange = range
      .toLowerCase()
      .replace(/\s+view$/, "")
      .trim();

    // Set date range based on selected view
    switch (normalizedRange) {
      case "custom":
        if (!start || !end) {
          throw new Error("Start and end dates are required for custom range");
        }
        startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(end);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "today's":
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      case "yearly":
        startDate = new Date(today.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new Error(`Invalid date range: ${range}`);
    }

    // Enhanced orders query with proper population
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).populate("userId", "name");

    if (!orders || orders.length === 0) {
      throw new Error(`No orders found for the selected period (${range})`);
    }

    // Rest of your existing code for processing orders and generating reports...
    const salesStats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce(
        (sum, order) => sum + (order.FinalAmount || 0),
        0
      ),
      totalProducts: orders.reduce(
        (sum, order) =>
          sum +
          order.orderedItems.reduce(
            (itemSum, item) => itemSum + (item.quantity || 0),
            0
          ),
        0
      ),
      averageOrderValue: orders.length
        ? orders.reduce((sum, order) => sum + (order.FinalAmount || 0), 0) /
          orders.length
        : 0,
      deliveredOrders: orders.filter(
        (order) => order.orderedItems[0]?.status === "Delivered"
      ).length,
      pendingOrders: orders.filter(
        (order) => order.orderedItems[0]?.status === "Pending"
      ).length,
      cancelledOrders: orders.filter(
        (order) => order.orderedItems[0]?.status === "Cancelled"
      ).length,
    };

    // Get payment statistics with case-insensitive comparison
    const paymentStats = {
      COD: orders.filter(
        (order) => order.paymentMethod?.toLowerCase() === "cod"
      ).length,
      Online: orders.filter(
        (order) => order.paymentMethod?.toLowerCase() === "razorpay"
      ).length,
      Wallet: orders.filter(
        (order) => order.paymentMethod?.toLowerCase() === "wallet"
      ).length,
    };

    // Process product statistics
    const productStats = orders.reduce((acc, order) => {
      order.orderedItems.forEach((item) => {
        if (!acc[item.productName]) {
          acc[item.productName] = { quantity: 0, revenue: 0 };
        }
        acc[item.productName].quantity += item.quantity || 0;
        acc[item.productName].revenue += item.totalPrice || 0;
      });
      return acc;
    }, {});

    const topProducts = Object.entries(productStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate total payments
    const totalPayments = orders.length;

    // Group orders by status
    const ordersByStatus = orders.reduce((acc, order) => {
      order.orderedItems.forEach(item => {
        if (!acc[item.status]) {
          acc[item.status] = [];
        }
        acc[item.status].push({
          orderId: order.orderId,
          date: order.createdAt,
          customer: order.userId.name,
          product: item.productName,
          quantity: item.quantity,
          price: item.totalPrice,
          payment: order.paymentMethod
        });
      });
      return acc;
    }, {});

    // Calculate status counts
    const statusCounts = Object.keys(ordersByStatus).reduce((acc, status) => {
      acc[status] = ordersByStatus[status].length;
      return acc;
    }, {});

    if (type === "excel") {
      const workbook = new Excel.Workbook();

      // Summary Sheet
      const summarySheet = workbook.addWorksheet("Summary");

      // Title and Info
      summarySheet.addRow(["MOBIFY - Sales Report"]).font = {
        bold: true,
        size: 16,
      };
      summarySheet.addRow([`Report Period: ${range}`]);
      summarySheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
      summarySheet.addRow([]);

      // Key Metrics
      summarySheet.addRow(["Key Metrics"]).font = { bold: true };
      const metricsData = [
        [
          "Total Revenue",
          `₹${salesStats.totalRevenue.toLocaleString("en-IN")}`,
        ],
        ["Total Orders", salesStats.totalOrders],
        ["Total Products Sold", salesStats.totalProducts],
        ["Average Order Value", `₹${salesStats.averageOrderValue.toFixed(2)}`],
      ];
      metricsData.forEach((row) => summarySheet.addRow(row));
      summarySheet.addRow([]);

      // Order Status Distribution
      summarySheet.addRow(["Order Status Distribution"]).font = { bold: true };
      summarySheet.addRow(["Status", "Count", "Percentage"]);
      [
        { label: "Delivered", count: statusCounts["Delivered"] || 0 },
        { label: "Pending", count: statusCounts["Pending"] || 0 },
        { label: "Processing", count: statusCounts["Processing"] || 0 },
        { label: "Shipped", count: statusCounts["Shipped"] || 0 },
        { label: "Cancelled", count: statusCounts["Cancelled"] || 0 },
        { label: "Return Request", count: statusCounts["Return Request"] || 0 },
        { label: "Return Approved", count: statusCounts["Return Approved"] || 0 },
        { label: "Return Rejected", count: statusCounts["Return Rejected"] || 0 },
        { label: "Returned", count: statusCounts["Returned"] || 0 }
      ].forEach((status) => {
        const percentage = ((status.count / salesStats.totalOrders) * 100).toFixed(1);
        summarySheet.addRow([status.label, status.count, `${percentage}%`]);
      });
      summarySheet.addRow([]);

      // Orders Detail Sheet - Keep only this one, remove the duplicate
      const orderDetailsSheet = workbook.addWorksheet("Order Details");

      // Set up columns with proper width
      orderDetailsSheet.columns = [
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Order Date", key: "date", width: 20 },
        { header: "Customer Name", key: "customer", width: 25 },
        { header: "Product Name", key: "product", width: 40 },
        { header: "Quantity", key: "quantity", width: 10 },
        { header: "Price", key: "price", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Payment", key: "payment", width: 15 },
      ];

      // Style header row
      const headerRow = orderDetailsSheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "E5E7EB" },
      };

      // Add order data with product details
      let orderRowIndex = 2;
      orders.forEach((order) => {
        order.orderedItems.forEach((item, i) => {
          const row = {
            orderId: i === 0 ? order.orderId : "", // Show orderId only for first product
            date: i === 0 ? new Date(order.createdAt).toLocaleString() : "",
            customer: i === 0 ? order.userId.name : "",
            product: item.productName,
            quantity: item.quantity,
            price: `₹${item.totalPrice.toLocaleString("en-IN")}`,
            status: item.status,
            payment: i === 0 ? order.paymentMethod : "",
          };

          const dataRow = orderDetailsSheet.addRow(row);

          // Add zebra striping
          if (orderRowIndex % 2 === 0) {
            dataRow.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F9FAFB" },
            };
          }

          // Add borders
          dataRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin", color: { argb: "E5E7EB" } },
              left: { style: "thin", color: { argb: "E5E7EB" } },
              bottom: { style: "thin", color: { argb: "E5E7EB" } },
              right: { style: "thin", color: { argb: "E5E7EB" } },
            };
          });

          orderRowIndex++;
        });

        // Add a blank row between orders
        orderDetailsSheet.addRow({});
        orderRowIndex++;
      });

      // Auto-fit columns
      orderDetailsSheet.columns.forEach((column) => {
        column.width = Math.max(column.width, 12);
      });

      // Top Products Sheet
      const productsSheet = workbook.addWorksheet("Top Products");
      productsSheet.columns = [
        { header: "Product Name", key: "name", width: 40 },
        { header: "Units Sold", key: "quantity", width: 15 },
        { header: "Revenue", key: "revenue", width: 20 },
      ];

      // Style the headers
      productsSheet.getRow(1).font = { bold: true };
      productsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "f8fafc" },
      };

      // Add top products data
      topProducts.forEach(([name, stats]) => {
        productsSheet.addRow({
          name,
          quantity: stats.quantity,
          revenue: `₹${stats.revenue.toLocaleString("en-IN")}`,
        });
      });

      // Add detailed status breakdown sheet
      const statusSheet = workbook.addWorksheet('Status Breakdown');
      statusSheet.columns = [
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Customer', key: 'customer', width: 25 },
        { header: 'Product', key: 'product', width: 40 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'Payment', key: 'payment', width: 15 }
      ];

      // Style status sheet header
      const statusHeaderRow = statusSheet.getRow(1);
      statusHeaderRow.font = { bold: true };
      statusHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E5E7EB' }
      };

      // Add data for each status
      let statusRowIndex = 2;
      Object.entries(ordersByStatus).forEach(([status, statusOrders]) => {
        // Add status header
        const statusRow = statusSheet.addRow([`${status} (${statusOrders.length} orders)`]);
        statusRow.font = { bold: true };
        statusRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
        statusRowIndex++;

        // Add orders for this status
        statusOrders.forEach(order => {
          const dataRow = statusSheet.addRow({
            status: '',  // Leave blank as we have the header
            orderId: order.orderId,
            date: new Date(order.date).toLocaleDateString(),
            customer: order.customer,
            product: order.product,
            quantity: order.quantity,
            price: `₹${order.price.toLocaleString('en-IN')}`,
            payment: order.payment
          });

          if (statusRowIndex % 2 === 0) {
            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FAFAFA' }
            };
          }
          statusRowIndex++;
        });

        // Add a blank row between statuses
        statusSheet.addRow([]);
        statusRowIndex++;
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=mobify-sales-report-${range}.xlsx`
      );

      await workbook.xlsx.write(res);
      return res.end();
    } else if (type === "pdf") {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        info: {
          Title: "Mobify Sales Report",
          Author: "Mobify Admin",
        },
        bufferPages: true // Add this to enable page buffering
      });

      // Setup document
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=mobify-sales-report-${range}.pdf`
      );
      doc.pipe(res);

      // Header with fixed positioning and proper spacing
      doc.moveDown(1);
      doc.font("Helvetica-Bold")
         .fontSize(24)
         .fillColor("#1e293b")
         .text("MOBIFY", {
             align: "center",
             width: doc.page.width - 100,  // Account for margins
         })
         .moveDown(0.5);

      doc.fontSize(14)
         .fillColor("#64748b")
         .text("Sales Report", {
             align: "center",
             width: doc.page.width - 100,
         })
         .moveDown(1);

      // Report Info Box with fixed width and centering
      const pageWidth = doc.page.width - 100; // Account for margins
      const infoBoxY = doc.y;
      doc.rect(50, infoBoxY, pageWidth, 40)
         .fillAndStroke("#f8fafc", "#e2e8f0");

      doc.fontSize(10)
         .fillColor("#1e293b")
         .text(`Period: ${range} | Generated: ${new Date().toLocaleDateString()}`, {
             width: pageWidth,
             align: "center",
             y: infoBoxY + 15
         });

      // Add more spacing after header
      doc.moveDown(4);

      // Key Metrics Grid
      doc.moveDown(1.5);
      const metricsY = doc.y;
      const metrics = [
        {
          label: "Total Revenue",
          value: `₹${salesStats.totalRevenue.toLocaleString("en-IN")}`,
        },
        { label: "Orders", value: salesStats.totalOrders },
        { label: "Products Sold", value: salesStats.totalProducts },
        {
          label: "Avg. Order Value",
          value: `₹${salesStats.averageOrderValue.toFixed(2)}`,
        },
      ];

      // Draw metrics grid
      metrics.forEach((metric, i) => {
        const x = 50 + (i % 2) * 250;
        const y = metricsY + Math.floor(i / 2) * 50;

        doc.rect(x, y, 235, 40).fillAndStroke("#ffffff", "#e2e8f0");

        doc
          .fontSize(10)
          .fillColor("#64748b")
          .text(metric.label, x + 10, y + 8)
          .fontSize(14)
          .fillColor("#1e293b")
          .text(metric.value, x + 10, y + 22);
      });

      // Order Status Table
      doc.moveDown(5);
      doc
        .fontSize(12)
        .fillColor("#1e293b")
        .text("Order Status Distribution", 50, doc.y)
        .moveDown(0.5);

      // Draw status table
      const statusTableTop = doc.y;
      const statusHeaders = ["Status", "Count", "Percentage"];
      const statusColWidths = [200, 100, 100];

      // Table header
      doc.rect(50, statusTableTop, 400, 20).fill("#f8fafc");

      let xPos = 50;
      statusHeaders.forEach((header, i) => {
        doc
          .fillColor("#1e293b")
          .fontSize(10)
          .text(header, xPos + 5, statusTableTop + 5);
        xPos += statusColWidths[i];
      });

      // Table rows
      const statuses = [
        { label: "Delivered", count: salesStats.deliveredOrders },
        { label: "Pending", count: salesStats.pendingOrders },
        { label: "Cancelled", count: salesStats.cancelledOrders },
      ];

      let yPos = statusTableTop + 25;
      statuses.forEach((status, i) => {
        const percentage = (
          (status.count / salesStats.totalOrders) *
          100
        ).toFixed(1);

        // Zebra striping
        if (i % 2 === 0) {
          doc.rect(50, yPos - 5, 400, 20).fill("#f8fafc");
        }

        xPos = 50;
        doc.fillColor("#64748b").fontSize(10);

        // Status
        doc.text(status.label, xPos + 5, yPos);
        xPos += statusColWidths[0];

        // Count
        doc.text(status.count.toString(), xPos + 5, yPos);
        xPos += statusColWidths[1];

        // Percentage
        doc.text(`${percentage}%`, xPos + 5, yPos);

        yPos += 20;
      });

      // Payment Methods Table
      doc.moveDown(4);
      doc
        .fontSize(12)
        .fillColor("#1e293b")
        .text("Payment Methods Distribution", 50, doc.y)
        .moveDown(0.5);

      // Draw payment methods table
      const paymentTableTop = doc.y;
      const paymentHeaders = ["Payment Method", "Count", "Percentage"];
      const paymentColWidths = [200, 100, 100];

      // Table header
      doc.rect(50, paymentTableTop, 400, 20).fill("#f8fafc");

      xPos = 50;
      paymentHeaders.forEach((header, i) => {
        doc
          .fillColor("#1e293b")
          .fontSize(10)
          .text(header, xPos + 5, paymentTableTop + 5);
        xPos += paymentColWidths[i];
      });

      // Updated payment methods array
      const paymentMethods = [
        { label: "COD", count: paymentStats.COD },
        { label: "Online Payment", count: paymentStats.Online },
        { label: "Wallet", count: paymentStats.Wallet },
      ].filter((method) => method.count > 0); // Only show methods with orders

      yPos = paymentTableTop + 25;
      paymentMethods.forEach((method, i) => {
        const percentage =
          totalPayments > 0
            ? ((method.count / totalPayments) * 100).toFixed(1)
            : "0.0";

        // Zebra striping
        if (i % 2 === 0) {
          doc.rect(50, yPos - 5, 400, 20).fill("#f8fafc");
        }

        xPos = 50;
        doc.fillColor("#64748b").fontSize(10);

        doc.text(method.label, xPos + 5, yPos);
        xPos += paymentColWidths[0];

        doc.text(method.count.toString(), xPos + 5, yPos);
        xPos += paymentColWidths[1];

        doc.text(`${percentage}%`, xPos + 5, yPos);

        yPos += 20;
      });

      // Add Order Status Breakdown section
      doc.moveDown(4); // Add more space after payment methods

      Object.entries(ordersByStatus).forEach(([status, statusOrders]) => {
        // Add new page for each status section
        doc.addPage();

        doc.fontSize(16)
           .fillColor('#1e293b')
           .text(`${status} Orders (${statusOrders.length})`, {
               underline: true,
               align: 'left'
           })
           .moveDown(1);

        // Table headers with adjusted widths and spacing
        const headers = ['Order ID', 'Date', 'Customer', 'Product', 'Amount'];
        const colWidths = [90, 90, 130, 130, 90];
        const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
        
        // Draw header background
        doc.rect(50, doc.y, tableWidth, 25).fill('#f8fafc');

        // Add headers with proper spacing
        let xPos = 50;
        headers.forEach((header, i) => {
            doc.fillColor('#1e293b')
               .fontSize(11)
               .text(header, xPos + 5, doc.y - 20, {
                   width: colWidths[i] - 10,
                   align: 'left'
               });
            xPos += colWidths[i];
        });

        let yPos = doc.y + 10;

        // Add orders with proper spacing
        statusOrders.forEach((order, index) => {
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;

                // Redraw headers on new page
                doc.rect(50, yPos, tableWidth, 25).fill('#f8fafc');
                xPos = 50;
                headers.forEach((header, i) => {
                    doc.fillColor('#1e293b')
                       .fontSize(11)
                       .text(header, xPos + 5, yPos + 5, {
                           width: colWidths[i] - 10,
                           align: 'left'
                       });
                    xPos += colWidths[i];
                });
                yPos += 35;
            }

            // Zebra striping
            if (index % 2 === 0) {
                doc.rect(50, yPos, tableWidth, 25).fill('#f8fafc');
            }

            // Order details
            xPos = 50;
            [
                order.orderId.slice(-8),
                new Date(order.date).toLocaleDateString(),
                order.customer,
                order.product,
                `₹${order.price.toLocaleString('en-IN')}`
            ].forEach((text, i) => {
                doc.fillColor('#64748b')
                   .fontSize(10)
                   .text(text, xPos + 5, yPos + 5, {
                       width: colWidths[i] - 10,
                       align: i === 4 ? 'right' : 'left'
                   });
                xPos += colWidths[i];
            });

            yPos += 25;
        });
    });

    // Add footer to all pages
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8)
           .fillColor("#64748b")
           .text(
               "© Mobify | Generated by Admin Dashboard",
               50,
               doc.page.height - 30,
               {
                   align: "center"
               }
           );
    }

    doc.end();
    }
  } catch (error) {
    console.error("Download Report Error:", error);
    res.status(500).send(`Error generating report: ${error.message}`);
  }
};

// Add a new endpoint to get data for custom date range chart
const getCustomRangeData = async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = new Date(start);
    const endDate = new Date(end);

    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name")
      .sort({ createdAt: 1 });

    // Calculate summary stats
    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce(
        (sum, order) => sum + (order.FinalAmount || 0),
        0
      ),
      totalProducts: orders.reduce(
        (sum, order) =>
          sum +
          order.orderedItems.reduce(
            (itemSum, item) => itemSum + item.quantity,
            0
          ),
        0
      ),
    };

    // Process chart data
    const dailyData = {};
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      dailyData[dateStr] = { count: 0, revenue: 0 };
    }

    orders.forEach((order) => {
      const dateStr = order.createdAt.toISOString().split("T")[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].count++;
        dailyData[dateStr].revenue += order.FinalAmount || 0;
      }
    });

    const chartData = {
      labels: Object.keys(dailyData).map((date) =>
        new Date(date).toLocaleDateString()
      ),
      orders: Object.values(dailyData).map((d) => d.count),
      revenue: Object.values(dailyData).map((d) => d.revenue),
    };

    res.json({
      stats,
      chartData,
      orders: orders.slice(0, 5), // Send only latest 5 orders for table
      success: true,
    });
  } catch (error) {
    console.error("Custom Range Data Error:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch custom range data", success: false });
  }
};

// Add a new endpoint to handle chart statistics
const getChartStats = async (req, res) => {
  try {
    const { range } = req.query;
    const today = new Date();
    let startDate, endDate;

    // Simplified date range logic
    switch (range) {
      case "today":
        startDate = new Date().setHours(0, 0, 0, 0);
        endDate = new Date().setHours(23, 59, 59, 999);
        break;
      case "weekly":
        startDate = new Date(today.setDate(today.getDate() - 7));
        endDate = new Date();
        break;
      case "monthly":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date();
        break;
      case "yearly":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date();
        break;
      default:
        startDate = new Date(today.setDate(today.getDate() - 7)); // Default to weekly
        endDate = new Date();
    }

    const [paymentStats, ordersData] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
            "orderedItems.status": { $ne: "Cancelled" },
          },
        },
        {
          $group: {
            _id: "$paymentMethod",
            count: { $sum: 1 },
          },
        },
      ]),
      Order.find({
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
      }),
    ]);

    // Initialize all possible statuses with 0
    const salesStats = {
      deliveredOrders: 0,
      pendingOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      cancelledOrders: 0,
      returnRequestedOrders: 0,
      returnApprovedOrders: 0,
      returnRejectedOrders: 0,
      returnedOrders: 0,
    };

    // Count orders for each status
    ordersData.forEach((order) => {
      order.orderedItems.forEach((item) => {
        switch (item.status) {
          case "Delivered":
            salesStats.deliveredOrders++;
            break;
          case "Pending":
            salesStats.pendingOrders++;
            break;
          case "Processing":
            salesStats.processingOrders++;
            break;
          case "Shipped":
            salesStats.shippedOrders++;
            break;
          case "Cancelled":
            salesStats.cancelledOrders++;
            break;
          case "Return Request":
            salesStats.returnRequestedOrders++;
            break;
          case "Return Approved":
            salesStats.returnApprovedOrders++;
            break;
          case "Return Rejected":
            salesStats.returnRejectedOrders++;
            break;
          case "Returned":
            salesStats.returnedOrders++;
            break;
        }
      });
    });

    res.json({
      success: true,
      paymentStats: {
        COD: paymentStats.find((p) => p._id === "cod")?.count || 0,
        Online: paymentStats.find((p) => p._id === "razorpay")?.count || 0,
        Wallet: paymentStats.find((p) => p._id === "wallet")?.count || 0,
      },
      salesStats,
    });
  } catch (error) {
    console.error("Chart Stats Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  loadLogin,
  verifyAdminLogin,
  loadDashboard,
  show_error,
  logout,
  downloadReport,
  getCustomRangeData,
  getChartStats,
};
