const Coupon = require('../../models/couponSchema');

const couponController = {
    getCouponsPage: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 3; // Show 3 coupons per page
            const skip = (page - 1) * limit;

            const totalCoupons = await Coupon.countDocuments({ isDeleted: false });
            const totalPages = Math.ceil(totalCoupons / limit);

            const coupons = await Coupon.find({ isDeleted: false })
                .sort({ createdOn: -1 })
                .skip(skip)
                .limit(limit);

            res.render('admin/coupon', { 
                coupons,
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            });
        } catch (error) {
            console.error('Error fetching coupons:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    addCoupon: async (req, res) => {
        try {
            const { name, expireOn, offerPrice, minimumPrice, maxUses, maxUsesPerUser } = req.body;

            // Basic validation
            if (!name || !expireOn || !offerPrice || !minimumPrice) {
                return res.status(400).json({
                    success: false,
                    error: 'All fields are required'
                });
            }

            // Validate offer amount
            if (parseFloat(offerPrice) >= parseFloat(minimumPrice)) {
                return res.status(400).json({
                    success: false,
                    error: 'Offer amount must be less than minimum purchase amount'
                });
            }

            // Validate expiry date
            const expiryDate = new Date(expireOn);
            if (expiryDate <= new Date()) {
                return res.status(400).json({
                    success: false,
                    error: 'Expiry date must be in the future'
                });
            }

            // Check for existing coupon
            const existingCoupon = await Coupon.findOne({
                name: name.toUpperCase(),
                isDeleted: false
            });

            if (existingCoupon) {
                return res.status(400).json({
                    success: false,
                    error: 'Coupon code already exists'
                });
            }

            // Create new coupon
            const newCoupon = new Coupon({
                name: name.toUpperCase(),
                expireOn: expiryDate,
                offerPrice: parseFloat(offerPrice),
                minimumPrice: parseFloat(minimumPrice),
                maxUses: parseInt(maxUses) || 100,
                maxUsesPerUser: parseInt(maxUsesPerUser) || 1
            });

            await newCoupon.save();
            res.json({ success: true });
        } catch (error) {
            console.error('Add Coupon Error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    },

    toggleStatus: async (req, res) => {
        try {
            const coupon = await Coupon.findById(req.params.id);
            if (!coupon) {
                return res.status(404).json({ success: false, error: 'Coupon not found' });
            }
            
            coupon.isListed = !coupon.isListed;
            await coupon.save();
            res.json({ success: true });
        } catch (error) {
            console.error('Toggle Status Error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    },

    deleteCoupon: async (req, res) => {
        try {
            const result = await Coupon.findByIdAndUpdate(
                req.params.id,
                { isDeleted: true },
                { new: true }
            );
            
            if (!result) {
                return res.status(404).json({ success: false, error: 'Coupon not found' });
            }
            
            res.json({ success: true });
        } catch (error) {
            console.error('Delete Coupon Error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
};

module.exports = couponController;
