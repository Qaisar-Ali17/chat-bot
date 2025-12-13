const path = require('path');
const fs = require('fs');
const multer = require('multer');

const baseDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kind = file.mimetype.startsWith('image/') ? 'images' : file.mimetype.startsWith('video/') ? 'videos' : 'files';
    const dir = path.join(baseDir, kind);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});

// Profile image specific validation
const profileImageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG/PNG images are allowed for profile pictures'), false);
  }
  cb(null, true);
};

const generalLimits = { fileSize: Number(process.env.MAX_FILE_SIZE_MB || 100) * 1024 * 1024 };
const profileImageLimits = { fileSize: 5 * 1024 * 1024 }; // 5MB max for profile images

const upload = multer({ storage, limits: generalLimits });
const profileUpload = multer({ storage, limits: profileImageLimits, fileFilter: profileImageFilter });

module.exports = { upload, profileUpload };
