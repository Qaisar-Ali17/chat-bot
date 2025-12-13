const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/userController');

router.get('/', auth, ctrl.list);
router.get('/search', auth, ctrl.search);
router.post('/:id/block', auth, ctrl.block);
router.post('/:id/unblock', auth, ctrl.unblock);
router.post('/profile', auth, ctrl.updateProfile);

module.exports = router;
