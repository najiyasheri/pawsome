// middleware/upload.js
const { CloudinaryStorage } = require("@fluidjs/multer-cloudinary");
const cloudinary = require("../config/cloudinary"); // should export cloudinary.v2
const multer = require("multer");
const path = require("path");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // ← Changed to function (recommended by many modern examples)
    return {
      folder: "products",
      allowed_formats: ["jpg", "jpeg", "png", "gif"],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
      resource_type: "image", // ← Explicitly set (helps prevent rare format confusion)
    };
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("Only images (jpeg, jpg, png, gif) are allowed!"));
  },
});

const uploadProductImages = upload.fields([
  { name: "images[]", maxCount: 4 },
  { name: "replaceImages[0]", maxCount: 1 },
  { name: "replaceImages[1]", maxCount: 1 },
  { name: "replaceImages[2]", maxCount: 1 },
  { name: "replaceImages[3]", maxCount: 1 },
]);

module.exports = uploadProductImages;
