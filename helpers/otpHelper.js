const Otp = require("../models/Otp");
const nodemailer=require('nodemailer')

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function generateExpiry(minutes = 5) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

const sendOtp = async (email, otp) => {
  try {

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });


    const mailOptions = {
      from: `"Pawsome" <${process.env.EMAIL_USER}>`, 
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>Verify your email</h2>
        <p>Your OTP code is:</p>
        <h1 style="color:#2e86de;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(" OTP sent successfully to", email);
    return true;
  } catch (err) {
    console.error("Error sending OTP:", err);
    return false;
  }
};



module.exports = {
  generateOTP,
  generateExpiry,
  sendOtp
};



