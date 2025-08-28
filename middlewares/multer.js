const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, gif) are allowed'));
    }
});

// Define fields for new images and replacement images
const uploadProductImages = upload.fields([
    { name: 'images[]', maxCount: 4 }, // For new images
    { name: 'replaceImages[0]', maxCount: 1 }, // For replacing image at index 0
    { name: 'replaceImages[1]', maxCount: 1 }, // For replacing image at index 1
    { name: 'replaceImages[2]', maxCount: 1 }, // For replacing image at index 2
    { name: 'replaceImages[3]', maxCount: 1 }  // For replacing image at index 3
]);


module.exports = uploadProductImages;