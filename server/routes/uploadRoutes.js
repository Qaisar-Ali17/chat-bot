const router = require('express').Router();
const auth = require('../middleware/auth');
const { upload, profileUpload } = require('../middleware/upload');
const ctrl = require('../controllers/uploadController');

router.post('/file', auth, upload.single('file'), ctrl.single);
router.post('/profile', auth, profileUpload.single('file'), ctrl.profile);

module.exports = router;
