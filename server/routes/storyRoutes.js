const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/storyController');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.delete('/:id', auth, ctrl.remove);

module.exports = router;

