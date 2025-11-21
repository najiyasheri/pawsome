// utils/deleteImage.js
const cloudinary = require("../config/cloudinary");

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted from Cloudinary: ${publicId}`);
  } catch (err) {
    console.error(`Failed to delete ${publicId}:`, err);
  }
};

module.exports = deleteFromCloudinary;
