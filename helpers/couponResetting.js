const Coupon = require("../models/couponSchema");

const resetCouponOffer = async () => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      expireOn: { $lte: now },
      isListed: true,
    });

    console.log("Coupon fetched:", coupons);

    for (const coupon of coupons) {
      try {
        // Reset coupon offer
        coupon.isListed = false;
        await coupon.save();
        console.log(`coupon "${coupon.name}" offer reset.`);
      } catch (err) {
        console.error(`Error processing coupon "${coupon.name}":`, err);
      }
    }
  } catch (error) {
    console.error("Error in cron job:", error);
  }
};

module.exports = resetCouponOffer;
