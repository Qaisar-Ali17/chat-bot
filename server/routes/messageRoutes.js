const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/messageController');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Add a new route for getting all messages (for frontend compatibility)
router.get('/', auth, async (req, res, next) => {
  try {
    // For now, return empty messages array to make frontend work
    // In a real implementation, this would fetch messages from all conversations
    res.json({ messages: [] });
  } catch(e) {
    next(e);
  }
});

// Handle message sending without conversation ID (auto-create conversation)
router.post('/', auth, async (req, res, next) => {
  try {
    const { text, recipientId } = req.body;

    if (!text && !req.files) {
      return res.status(400).json({ message: 'Message text or attachment is required' });
    }

    // If recipientId is provided, find or create conversation
    if (recipientId) {
      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ message: 'Recipient not found' });
      }

      // Find existing conversation between users
      let conversation = await Conversation.findOne({
        participants: { $all: [req.user.id, recipientId] },
        isGroup: false
      });

      // Create new conversation if none exists
      if (!conversation) {
        conversation = await Conversation.create({
          type: 'DIRECT',
          participants: [req.user.id, recipientId],
          createdBy: req.user.id,
          title: `${req.user.username} & ${recipient.username}`
        });
      }

      // Forward to existing send controller with conversation ID
      req.params.id = conversation._id;
      req.body.content = text;
      return ctrl.send(req, res, next);
    }

    res.status(400).json({ message: 'Recipient ID is required for new messages' });
  } catch(e) {
    next(e);
  }
});

router.get('/:id', auth, ctrl.list);
router.post('/:id', auth, ctrl.send);
router.post('/:messageId/read', auth, ctrl.markRead);
router.get('/:conversationId/search', auth, ctrl.search);
router.post('/:messageId/reactions', auth, ctrl.addReaction);
router.delete('/:messageId', auth, ctrl.deleteMessage);

module.exports = router;
