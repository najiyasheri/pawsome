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
        fileSize: 5 * 1024 * 1024 
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


const uploadProductImages = upload.fields([
    { name: 'images[]', maxCount: 4 }, 
    { name: 'replaceImages[0]', maxCount: 1 }, 
    { name: 'replaceImages[1]', maxCount: 1 }, 
    { name: 'replaceImages[2]', maxCount: 1 }, 
    { name: 'replaceImages[3]', maxCount: 1 }  
]);


module.exports = uploadProductImages;