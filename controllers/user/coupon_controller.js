const Coupon = require("../../models/couponSchema");

const couponController = {
  getAvailableCoupons: async (req, res) => {
    try {
      const currentDate = new Date();
      const cartTotal = parseFloat(req.query.total) || 0;

      const coupons = await Coupon.find({
        isListed: true,
        isDeleted: false,
        expireOn: { $gt: currentDate },
        minimumPrice: { $lte: cartTotal },
      });

      console.log("Found coupons:", coupons); // Debug log

      if (!coupons || coupons.length === 0) {
        return res.json({
          status: "error",
          message: "No coupons available for your cart value",
          coupons: [],
        });
      }

      const formattedCoupons = coupons.map((coupon) => ({
        code: coupon.name,
        discount: coupon.offerPrice,
        minPurchase: coupon.minimumPrice,
        expiry: coupon.expireOn,
        usesLeft: coupon.maxUses - (coupon.usesCount || 0),
        description: `Get ₹${coupon.offerPrice} off on orders above ₹${coupon.minimumPrice}`,
        savings: `₹${coupon.offerPrice}`, // Changed to show fixed amount instead of percentage
      }));

      console.log("Formatted coupons:", formattedCoupons); // Debug log

      res.json({
        status: "success",
        coupons: formattedCoupons,
      });
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to fetch available coupons",
      });
    }
  },

  validateCoupon: async (req, res) => {
    try {
      const { code, cartTotal } = req.body;
      const userId = req.user._id;

      const coupon = await Coupon.findOne({
        name: code,
        isListed: true,
        isDeleted: false,
        expireOn: { $gt: new Date() },
      });

      if (!coupon) {
        return res.json({
          status: "error",
          message: "Invalid or expired coupon code",
        });
      }

      if (cartTotal < coupon.minimumPrice) {
        return res.json({
          status: "error",
          message: `Minimum purchase of ₹${coupon.minimumPrice} required`,
        });
      }

      if (coupon.usesCount >= coupon.maxUses) {
        return res.json({
          status: "error",
          message: "Coupon usage limit reached",
        });
      }

      res.json({
        status: "success",
        discount: coupon.offerPrice,
        message: "Coupon applied successfully!",
      });
    } catch (error) {
      console.error("Error validating coupon:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to validate coupon",
      });
    }
  },
};

module.exports = couponController;
