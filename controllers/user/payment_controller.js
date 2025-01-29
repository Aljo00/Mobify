const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const Razorpay = require('razorpay');

let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZARPAY_API_KEY_ID,        // Changed to match .env
    key_secret: process.env.RAZARPAY_API_SECRET_KEY  // Changed to match .env
  });

  if (!process.env.RAZARPAY_API_KEY_ID || !process.env.RAZARPAY_API_SECRET_KEY) {
    throw new Error('Razorpay credentials are missing in environment variables');
  }
} catch (error) {
  console.error('Razorpay initialization failed:', error);
}

const checkStock = async (req, res) => {
  try {
    if (!razorpay) {
      throw new Error('Payment system is not properly configured');
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('orderedItems.product');

    if (!order) {
      throw new Error('Order not found');
    }

    // Check each ordered item's stock
    for (const item of order.orderedItems) {
      const product = item.product;
      const combo = product.combos.find(c => 
        c.ram === item.RAM && 
        c.storage === item.Storage
      );

      if (!combo || combo.quantity < item.quantity) {
        return res.json({
          success: false,
          message: `${product.productName} is out of stock!`
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Stock check error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error checking stock availability'
    });
  }
};

const initiatePendingPayment = async (req, res) => {
  try {
    if (!razorpay) {
      throw new Error('Payment system is not properly configured');
    }

    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    const options = {
      amount: order.FinalAmount * 100,
      currency: "INR",
      receipt: orderId.toString()
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      key_id: process.env.RAZARPAY_API_KEY_ID,  // Changed to match .env
      amount: options.amount,
      id: razorpayOrder.id
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment'
    });
  }
};

const verifyPendingPayment = async (req, res) => {
  try {
    const { orderId, payment_id, order_id, signature } = req.body;

    // Verify signature
    const body = order_id + "|" + payment_id;
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZARPAY_API_SECRET_KEY)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    // Find and update order
    const order = await Order.findById(orderId).populate('orderedItems.product');
    if (!order) {
      throw new Error('Order not found');
    }

    // Update product quantities and verify stock one final time
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        throw new Error(`Product ${item.product._id} not found`);
      }

      const comboIndex = product.combos.findIndex(c => 
        c.ram === item.RAM && 
        c.storage === item.Storage
      );

      if (comboIndex === -1) {
        throw new Error(`Product combo not found for ${product.productName}`);
      }

      // Check if we still have enough stock
      if (product.combos[comboIndex].quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.productName}`);
      }

      // Decrease the quantity
      product.combos[comboIndex].quantity -= item.quantity;

      // If quantity reaches 0, update status to "Out of Stock"
      if (product.combos[comboIndex].quantity === 0) {
        product.combos[comboIndex].status = "Out of Stock";
      }

      // Save the product with updated quantity
      await product.save();
    }

    // Update order status and payment details
    order.orderedItems.forEach(item => {
      item.status = 'Pending';
    });
    
    order.paymentDetails = {
      razorpay_payment_id: payment_id,
      razorpay_order_id: order_id,
      razorpay_signature: signature
    };

    await order.save();

    res.json({ 
      success: true,
      message: 'Payment verified and order confirmed successfully'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment and update inventory'
    });
  }
};

const initiateCodToOnline = async (req, res) => {
  try {
    if (!razorpay) {
      throw new Error('Payment system is not properly configured');
    }

    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.paymentMethod !== 'cod') { // Changed from 'COD' to 'cod'
      throw new Error('This order is not a COD order');
    }

    const options = {
      amount: order.FinalAmount * 100,
      currency: "INR",
      receipt: orderId.toString()
    };

    const razorpayOrder = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      key_id: process.env.RAZARPAY_API_KEY_ID,
      amount: options.amount,
      id: razorpayOrder.id
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate payment'
    });
  }
};

const verifyCodToOnline = async (req, res) => {
  try {
    const { orderId, payment_id, order_id, signature } = req.body;

    // Verify signature
    const body = order_id + "|" + payment_id;
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZARPAY_API_SECRET_KEY)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid signature');
    }

    // Update order payment method and details
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentMethod = 'razorpay';
    order.paymentDetails = {
      razorpay_payment_id: payment_id,
      razorpay_order_id: order_id,
      razorpay_signature: signature
    };

    await order.save();

    res.json({ 
      success: true,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to verify payment'
    });
  }
};

module.exports = {
  checkStock,
  initiatePendingPayment,
  verifyPendingPayment,
  initiateCodToOnline,
  verifyCodToOnline
};
