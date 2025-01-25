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

const downloadReport = async (req, res) => {
  try {
    const { type, range } = req.query;
    const today = new Date();
    let startDate, endDate;

    // Set date range based on selected view
    switch (range) {
      case "today's view":
        startDate = new Date(today.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
        break;
      case "weekly view":
        startDate = new Date(today.setDate(today.getDate() - 7));
        endDate = new Date();
        break;
      case "monthly view":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date();
        break;
      case "yearly view":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date();
        break;
    }

    // Enhanced statistics calculation
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .populate("userId", "name")
      .populate("orderedItems.product");

    const salesStats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.FinalAmount, 0),
      totalProducts: orders.reduce(
        (sum, order) =>
          sum +
          order.orderedItems.reduce(
            (itemSum, item) => itemSum + item.quantity,
            0
          ),
        0
      ),
      averageOrderValue: orders.length
        ? orders.reduce((sum, order) => sum + order.FinalAmount, 0) /
          orders.length
        : 0,
      deliveredOrders: orders.filter(
        (order) => order.orderedItems[0].status === "Delivered"
      ).length,
      pendingOrders: orders.filter(
        (order) => order.orderedItems[0].status === "Pending"
      ).length,
      cancelledOrders: orders.filter(
        (order) => order.orderedItems[0].status === "Cancelled"
      ).length,
      paymentMethods: {
        online: orders.filter((order) => order.paymentMethod === "Online")
          .length,
        cod: orders.filter((order) => order.paymentMethod === "COD").length,
      },
    };

    // Get top selling products
    const productStats = {};
    orders.forEach((order) => {
      order.orderedItems.forEach((item) => {
        if (!productStats[item.productName]) {
          productStats[item.productName] = {
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[item.productName].quantity += item.quantity;
        productStats[item.productName].revenue += item.totalPrice;
      });
    });

    const topProducts = Object.entries(productStats)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 5);

    // Add payment method statistics
    const paymentStats = {
      COD: orders.filter((order) => order.paymentMethod === "cod").length,
      Online: orders.filter((order) => order.paymentMethod === "online").length,
      Wallet: orders.filter((order) => order.paymentMethod === "wallet").length,
    };

    // Calculate total payments
    const totalPayments = orders.length; // This is more accurate than summing paymentStats

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
        { label: "Delivered", count: salesStats.deliveredOrders },
        { label: "Pending", count: salesStats.pendingOrders },
        { label: "Cancelled", count: salesStats.cancelledOrders },
      ].forEach((status) => {
        const percentage = (
          (status.count / salesStats.totalOrders) *
          100
        ).toFixed(1);
        summarySheet.addRow([status.label, status.count, `${percentage}%`]);
      });
      summarySheet.addRow([]);

      // Payment Methods Distribution
      summarySheet.addRow(["Payment Methods Distribution"]).font = {
        bold: true,
      };
      summarySheet.addRow(["Payment Method", "Count", "Percentage"]);
      [
        { label: "COD", count: paymentStats.COD },
        { label: "Online Payment", count: paymentStats.Online },
        { label: "Wallet", count: paymentStats.Wallet },
      ]
        .filter((method) => method.count > 0)
        .forEach((method) => {
          const percentage =
            totalPayments > 0
              ? ((method.count / totalPayments) * 100).toFixed(1)
              : "0.0";
          summarySheet.addRow([method.label, method.count, `${percentage}%`]);
        });
      summarySheet.addRow([]);

      // Orders Detail Sheet - Keep only this one, remove the duplicate
      const orderDetailsSheet = workbook.addWorksheet("Order Details");
      
      // Set up columns with proper width
      orderDetailsSheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Order Date', key: 'date', width: 20 },
        { header: 'Customer Name', key: 'customer', width: 25 },
        { header: 'Product Name', key: 'product', width: 40 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Price', key: 'price', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Payment', key: 'payment', width: 15 }
      ];

      // Style header row
      const headerRow = orderDetailsSheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E5E7EB' }
      };

      // Add order data with product details
      let rowIndex = 2;
      orders.forEach(order => {
        order.orderedItems.forEach((item, i) => {
          const row = {
            orderId: i === 0 ? order.orderId : '', // Show orderId only for first product
            date: i === 0 ? new Date(order.createdAt).toLocaleString() : '',
            customer: i === 0 ? order.userId.name : '',
            product: item.productName,
            quantity: item.quantity,
            price: `₹${item.totalPrice.toLocaleString('en-IN')}`,
            status: item.status,
            payment: i === 0 ? order.paymentMethod : ''
          };

          const dataRow = orderDetailsSheet.addRow(row);

          // Add zebra striping
          if (rowIndex % 2 === 0) {
            dataRow.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F9FAFB' }
            };
          }

          // Add borders
          dataRow.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'E5E7EB' } },
              left: { style: 'thin', color: { argb: 'E5E7EB' } },
              bottom: { style: 'thin', color: { argb: 'E5E7EB' } },
              right: { style: 'thin', color: { argb: 'E5E7EB' } }
            };
          });

          rowIndex++;
        });

        // Add a blank row between orders
        orderDetailsSheet.addRow({});
        rowIndex++;
      });

      // Auto-fit columns
      orderDetailsSheet.columns.forEach(column => {
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
      });

      // Setup document
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=mobify-sales-report-${range}.pdf`
      );
      doc.pipe(res);

      // Header with proper spacing
      doc
        .font("Helvetica-Bold")
        .fontSize(24)
        .fillColor("#1e293b")
        .text("MOBIFY", { align: "center" })
        .moveDown(0.5);

      doc
        .fontSize(14)
        .fillColor("#64748b")
        .text("Sales Report", { align: "center" })
        .moveDown(1);

      // Report Info Box with fixed positioning and proper spacing
      const infoBoxY = doc.y + 10;
      doc.rect(50, infoBoxY, 495, 40).fillAndStroke("#f8fafc", "#e2e8f0");

      doc
        .fontSize(10)
        .fillColor("#1e293b")
        .text(
          `Period: ${range} | Generated: ${new Date().toLocaleDateString()}`,
          {
            align: "center",
            y: infoBoxY + 15,
          }
        );

      // Continue with metrics grid with adjusted spacing
      doc.moveDown(2.5);
      // const metricsY = doc.y;

      // Rest of the PDF generation code...

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

      // Orders Table - Update to show "No orders" if empty
      doc.moveDown(6);
      doc
        .fontSize(12)
        .fillColor("#1e293b")
        .text("Recent Orders", 50, doc.y)
        .moveDown(0.5);

      const tableTop = doc.y;
      const headers = [
        "Date",
        "Order ID",
        "Customer",
        "Product",
        "Payment",
        "Status",
        "Amount",
      ];
      const colWidths = [70, 80, 100, 120, 60, 70, 80];

      // Draw header background
      doc.rect(50, tableTop, 580, 20).fill("#f8fafc");

      // Add headers
      headers.forEach((header, i) => {
        let x = 50;
        for (let j = 0; j < i; j++) x += colWidths[j];
        doc
          .fillColor("#1e293b")
          .fontSize(10)
          .text(header, x + 5, tableTop + 5);
      });

      // Table rows with product details
      let y = tableTop + 25;

      if (orders.length === 0) {
        // Show "No orders found" message
        doc.rect(50, y - 5, 580, 30).fill("#f8fafc");
        doc
          .fillColor("#64748b")
          .fontSize(10)
          .text("No orders found for the selected period", 290, y + 5, {
            align: "center",
          });
      } else {
        orders.slice(0, 10).forEach((order, i) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          // Zebra striping
          if (i % 2 === 0) {
            doc.rect(50, y - 5, 580, 20).fill("#f8fafc");
          }

          let x = 50;
          doc.fontSize(9).fillColor("#64748b");

          // Date
          doc.text(new Date(order.createdAt).toLocaleDateString(), x + 5, y);
          x += colWidths[0];

          // Order ID
          doc.text(order.orderId.slice(-8), x + 5, y);
          x += colWidths[1];

          // Customer
          doc.text(order.userId.name || "N/A", x + 5, y, { width: 90 });
          x += colWidths[2];

          // Product (first product if multiple)
          if (order.orderedItems && order.orderedItems.length > 0) {
            const productName = order.orderedItems[0].productName;
            doc.text(
              productName.length > 20
                ? productName.substring(0, 20) + "..."
                : productName,
              x + 5,
              y,
              { width: 110 }
            );
          } else {
            doc.text("N/A", x + 5, y);
          }
          x += colWidths[3];

          // Payment Method
          doc.text(order.paymentMethod || "N/A", x + 5, y);
          x += colWidths[4];

          // Status with color
          if (order.orderedItems && order.orderedItems.length > 0) {
            const status = order.orderedItems[0].status;
            doc
              .fillColor(
                status === "Delivered"
                  ? "#10b981"
                  : status === "Pending"
                  ? "#f59e0b"
                  : "#ef4444"
              )
              .text(status, x + 5, y);
          } else {
            doc.text("N/A", x + 5, y);
          }
          x += colWidths[5];

          // Amount
          doc
            .fillColor("#64748b")
            .text(
              `₹${
                order.FinalAmount
                  ? order.FinalAmount.toLocaleString("en-IN")
                  : "0"
              }`,
              x + 5,
              y
            );

          y += 20;
        });
      }

      // Footer
      doc
        .fontSize(8)
        .fillColor("#64748b")
        .text(
          "© Mobify | Generated by Admin Dashboard",
          50,
          doc.page.height - 50,
          {
            align: "center",
          }
        );

      doc.end();
    }
  } catch (error) {
    console.error("Download Report Error:", error);
    res.status(500).send("Error generating report");
  }
};

module.exports = {
  loadLogin,
  verifyAdminLogin,
  loadDashboard,
  show_error,
  logout,
  downloadReport,
};
