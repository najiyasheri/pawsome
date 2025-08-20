const Otp = require("../models/otpSchema");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000);
}

function generateExpiry(minutes = 5) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = {
  generateOTP,
  generateExpiry,
};
