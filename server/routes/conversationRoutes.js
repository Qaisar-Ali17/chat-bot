const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/conversationController');

router.get('/', auth, ctrl.list);
router.post('/', auth, ctrl.create);
router.post('/:conversationId/participants', auth, ctrl.addParticipants);
router.delete('/:conversationId/participants/:participantId', auth, ctrl.removeParticipant);
router.post('/:conversationId/pin', auth, ctrl.pinConversation);
router.post('/:conversationId/archive', auth, ctrl.archiveConversation);

module.exports = router;
