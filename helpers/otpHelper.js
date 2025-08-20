function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000); // always 6 digits
}

function generateExpiry(minutes = 5) {
  return new Date(Date.now() + minutes * 60 * 1000); // default 5 minutes
}

module.exports = {
  generateOTP,
  generateExpiry,
};
