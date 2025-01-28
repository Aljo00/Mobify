const returnRequestApproved = (orderDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          font-family: 'Segoe UI', Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(45deg, #4361ee, #3f37c9);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .order-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .button {
          background-color: #4361ee;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin: 15px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 50px;
          font-weight: bold;
          margin: 10px 0;
        }
        .status-approved {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .status-rejected {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }
        .status-completed {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .highlight-box {
          border-left: 4px solid #4361ee;
          padding: 10px 15px;
          background-color: #f8fafc;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">📱 Mobify</div>
          <h2>Return Request Status Update</h2>
          <div class="status-badge status-approved">APPROVED ✓</div>
        </div>
        <div class="content">
          <p>Dear ${orderDetails.customerName},</p>
          <p>Your return request has been approved for the following order:</p>
          
          <div class="order-details">
            <p><strong>Order ID:</strong> #${orderDetails.orderId}</p>
            <p><strong>Product:</strong> ${orderDetails.productName}</p>
            <p><strong>Return Amount:</strong> ₹${orderDetails.totalPrice}</p>
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li>Package the item securely in its original packaging if possible</li>
            <li>Include all original accessories and documentation</li>
            <li>Our delivery partner will contact you for pickup</li>
          </ol>

          <p><strong>Note:</strong> Refund will be processed to your wallet once we receive and verify the returned item.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Mobify!</p>
          <p>If you have any questions, please contact our customer support.</p>
          <small>This is an automated message, please do not reply to this email.</small>
        </div>
      </div>
    </body>
    </html>
  `;
};

const returnRequestRejected = (orderDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          font-family: 'Segoe UI', Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(45deg, #4361ee, #3f37c9);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .order-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .button {
          background-color: #4361ee;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin: 15px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 50px;
          font-weight: bold;
          margin: 10px 0;
        }
        .status-approved {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .status-rejected {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }
        .status-completed {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .highlight-box {
          border-left: 4px solid #4361ee;
          padding: 10px 15px;
          background-color: #f8fafc;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">📱 Mobify</div>
          <h2>Return Request Status Update</h2>
          <div class="status-badge status-rejected">REQUEST REJECTED ✕</div>
        </div>
        <div class="content">
          <div class="highlight-box">
            <p>Dear ${orderDetails.customerName},</p>
            <p>We regret to inform you that your return request could not be approved for:</p>
          </div>
          <div class="order-details">
            <p><strong>Order ID:</strong> #${orderDetails.orderId}</p>
            <p><strong>Product:</strong> ${orderDetails.productName}</p>
          </div>

          <p>If you have any concerns, please contact our customer support team for assistance.</p>
        </div>
        <div class="footer">
          <p>Thank you for your understanding.</p>
          <p>Best regards,<br>Team Mobify</p>
          <small>This is an automated message, please do not reply to this email.</small>
        </div>
      </div>
    </body>
    </html>
  `;
};

const returnCompleted = (orderDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container {
          font-family: 'Segoe UI', Arial, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
          background: linear-gradient(45deg, #4361ee, #3f37c9);
          color: white;
          padding: 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px;
          line-height: 1.6;
          color: #333;
        }
        .order-details {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .button {
          background-color: #4361ee;
          color: white;
          padding: 12px 25px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          margin: 15px 0;
        }
        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 50px;
          font-weight: bold;
          margin: 10px 0;
        }
        .status-approved {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .status-rejected {
          background-color: #fee2e2;
          color: #dc2626;
          border: 1px solid #fca5a5;
        }
        .status-completed {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #7dd3fc;
        }
        .highlight-box {
          border-left: 4px solid #4361ee;
          padding: 10px 15px;
          background-color: #f8fafc;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">📱 Mobify</div>
          <h2>Return Status Update</h2>
          <div class="status-badge status-completed">RETURN COMPLETED ✓</div>
        </div>
        <div class="content">
          <div class="highlight-box">
            <p>Dear ${orderDetails.customerName},</p>
            <p>Your return has been successfully processed and completed!</p>
          </div>
          <div class="order-details">
            <p><strong>Order ID:</strong> #${orderDetails.orderId}</p>
            <p><strong>Product:</strong> ${orderDetails.productName}</p>
            <p><strong>Refund Amount:</strong> ₹${orderDetails.totalPrice}</p>
          </div>

          <p>The refund has been processed and added to your Mobify wallet.</p>
          <p>You can use this amount for your future purchases.</p>
        </div>
        <div class="footer">
          <p>Thank you for shopping with Mobify!</p>
          <p>We appreciate your business.</p>
          <small>This is an automated message, please do not reply to this email.</small>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  returnRequestApproved,
  returnRequestRejected,
  returnCompleted
};
