const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { isBlocked, blockedUserIdsFor } = require('../services/blockService');

exports.list = async (req, res, next) => {
  try{
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit || 30), 100);
    const beforeParam = req.query.before;
    const before = beforeParam && !Number.isNaN(Date.parse(beforeParam))
      ? new Date(beforeParam)
      : new Date();
    const convo = await Conversation.findById(id);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) return res.status(403).json({ message: 'Forbidden' });
    const blockedIds = await blockedUserIdsFor(req.user.id);
    if (convo.participants.some(p => blockedIds.includes(String(p)))) {
      return res.status(403).json({ message: 'Blocked relationship prevents access' });
    }
    const msgs = await Message.find({ conversation: id, createdAt: { $lt: before } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'username avatarUrl')
      .lean();
    res.json({ messages: msgs.reverse() });
  } catch(e){ next(e); }
};

exports.send = async (req, res, next) => {
  try{
    const { id } = req.params;
    const { content, attachments } = req.body;
    const convo = await Conversation.findById(id);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) return res.status(403).json({ message: 'Forbidden' });

    for (const pid of convo.participants) {
      if (String(pid) !== req.user.id && (await isBlocked(req.user.id, String(pid)))) {
        return res.status(403).json({ message: 'Blocked by participant' });
      }
    }

    if (!content && !(Array.isArray(attachments) && attachments.length)) {
      return res.status(400).json({ message: 'Message requires text or attachment' });
    }

    // Handle quoted message
    const quotedMessageData = {};
    if (req.body.quotedMessageId) {
      const quotedMessage = await Message.findById(req.body.quotedMessageId);
      if (quotedMessage) {
        quotedMessageData.messageId = quotedMessage._id;
        quotedMessageData.content = quotedMessage.content;
        quotedMessageData.author = quotedMessage.author;
        quotedMessageData.createdAt = quotedMessage.createdAt;
      }
    }

    const msg = await Message.create({
      conversation: id,
      author: req.user.id,
      content: content || '',
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'sent',
      quotedMessage: Object.keys(quotedMessageData).length > 0 ? quotedMessageData : undefined
    });
    convo.updatedAt = new Date();
    await convo.save();
    await msg.populate('author', 'username avatarUrl');

    // Mark as delivered to sender immediately
    msg.status = 'delivered';
    await msg.save();

    const io = req.app.get('io');
    if (io) io.to(id).emit('message:new', { message: msg });
    res.json({ message: msg });
  } catch(e){ next(e); }
};

exports.markRead = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is part of the conversation
    const convo = await Conversation.findById(message.conversation);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Check if user already marked as read
    const alreadyRead = message.readBy.some(r => String(r.user) === req.user.id);
    if (!alreadyRead) {
      message.readBy.push({ user: req.user.id });
      // If all participants have read, mark as read
      if (message.readBy.length === convo.participants.length) {
        message.status = 'read';
      } else {
        message.status = 'delivered';
      }
      await message.save();
    }

    res.json({ message: message });
  } catch(e) {
    next(e);
  }
};

exports.search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const { conversationId } = req.params;

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Check if user is part of the conversation
    const convo = await Conversation.findById(conversationId);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Search messages in this conversation
    const messages = await Message.find({
      conversation: conversationId,
      content: { $regex: q, $options: 'i' }
    })
    .populate('author', 'username avatarUrl')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({ messages });
  } catch(e) {
    next(e);
  }
};

exports.addReaction = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 2) {
      return res.status(400).json({ message: 'Invalid emoji' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is part of the conversation
    const convo = await Conversation.findById(message.conversation);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Find existing reaction
    const existingReaction = message.reactions.find(r => r.emoji === emoji);
    if (existingReaction) {
      // Check if user already reacted
      const alreadyReacted = existingReaction.users.some(u => String(u) === req.user.id);
      if (alreadyReacted) {
        // Remove reaction (toggle off)
        existingReaction.users = existingReaction.users.filter(u => String(u) !== req.user.id);
        // Remove reaction if no users left
        if (existingReaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        // Add user to existing reaction
        existingReaction.users.push(req.user.id);
      }
    } else {
      // Add new reaction
      message.reactions.push({
        emoji,
        users: [req.user.id]
      });
    }

    await message.save();
    await message.populate('author', 'username avatarUrl');

    const io = req.app.get('io');
    if (io) io.to(message.conversation).emit('message:reaction', { message });

    res.json({ message });
  } catch(e) {
    next(e);
  }
};

exports.deleteMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is the author
    if (String(message.author) !== req.user.id) {
      return res.status(403).json({ message: 'Only the message author can delete this message' });
    }

    // Check if user is part of the conversation
    const convo = await Conversation.findById(message.conversation);
    if (!convo || !convo.participants.map(String).includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (deleteForEveryone) {
      // Delete message for everyone
      await Message.findByIdAndDelete(messageId);

      const io = req.app.get('io');
      if (io) io.to(message.conversation).emit('message:deleted', {
        messageId,
        deletedForEveryone: true
      });
    } else {
      // Soft delete - mark as deleted for current user only
      // In a real implementation, you might add a 'deletedFor' field
      // For now, we'll just delete it
      await Message.findByIdAndDelete(messageId);

      const io = req.app.get('io');
      if (io) io.to(message.conversation).emit('message:deleted', {
        messageId,
        deletedForEveryone: false,
        deletedBy: req.user.id
      });
    }

    res.json({ success: true, messageId });
  } catch(e) {
    next(e);
  }
};
