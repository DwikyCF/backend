/**
 * File Upload Middleware
 * Middleware untuk handle file upload menggunakan multer
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = [
  './uploads',
  './uploads/services',
  './uploads/stylists',
  './uploads/products',
  './uploads/gallery',
  './uploads/profiles',
  './uploads/reviews',
  './uploads/payments',
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = './uploads';
    
    // Tentukan folder berdasarkan field name atau route
    if (file.fieldname === 'service_image' || req.path.includes('services')) {
      uploadPath = './uploads/services';
    } else if (file.fieldname === 'stylist_photo' || req.path.includes('stylists')) {
      uploadPath = './uploads/stylists';
    } else if (file.fieldname === 'product_image' || req.path.includes('products')) {
      uploadPath = './uploads/products';
    } else if (file.fieldname === 'gallery_image' || req.path.includes('gallery')) {
      uploadPath = './uploads/gallery';
    } else if (file.fieldname === 'profile_photo' || req.path.includes('profile')) {
      uploadPath = './uploads/profiles';
    } else if (file.fieldname === 'review_image' || req.path.includes('reviews')) {
      uploadPath = './uploads/reviews';
    } else if (file.fieldname === 'payment_proof' || req.path.includes('payments')) {
      uploadPath = './uploads/payments';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - hanya allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  
  next();
};

module.exports = {
  upload,
  handleMulterError,
};
