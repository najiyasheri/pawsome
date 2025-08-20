const { generateOTP, generateExpiry } = require("../helpers/otpHelper");
const Otp = require('../models/otpSchema')

const createAndSaveOTP = async (email) => {
    const otp = generateOTP();
    const expired_at = generateExpiry(5);
    const savedOtp=new Otp({otp,expired_a2t,email})
    await savedOtp.save()
    return otp
};

module.exports = {
    createAndSaveOTP
}