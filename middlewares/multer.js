// middleware/upload.js
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const multer = require('multer')

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    public_id: (req, file) =>
      `${Date.now()}-${file.originalname.split(".")[0]}`,
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only images (jpeg, jpg, png, gif) are allowed"));
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
