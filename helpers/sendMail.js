const nodemailer = require("nodemailer");

// Create transporter using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

const sendMail = async (to, subject, html) => {
  try {
    // Log the exact email being used
    console.log("Sending email to address:", to);

    const mailOptions = {
      from: {
        name: 'Mobify',
        address: process.env.NODEMAILER_EMAIL
      },
      to: to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully to:", to);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

module.exports = sendMail;
