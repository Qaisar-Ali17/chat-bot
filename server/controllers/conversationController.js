const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { isBlocked, blockedUserIdsFor } = require('../services/blockService');

exports.list = async (req, res, next) => {
  try{
    const blockedIds = await blockedUserIdsFor(req.user.id);
    const convos = await Conversation.find({
      // ensure the requester is a participant and no blocked users are in the room
      participants: { $in: [req.user.id], $nin: blockedIds }
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'username avatarUrl')
      .lean();

    // Add last message to each conversation
    for (const convo of convos) {
      const lastMessage = await Message.findOne({ conversation: convo._id })
        .sort({ createdAt: -1 })
        .populate('author', 'username')
        .lean();
      convo.lastMessage = lastMessage || null;
    }

    res.json({ conversations: convos });
  } catch(e){ next(e); }
};

exports.create = async (req, res, next) => {
  try{
    const { type, title, description, participantIds, avatarUrl } = req.body;
    if (!['DIRECT','GROUP'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    const others = Array.isArray(participantIds) ? participantIds : [];
    const participants = Array.from(new Set([req.user.id, ...others])).map(String);

    if (type === 'DIRECT' && participants.length !== 2) {
      return res.status(400).json({ message: 'DIRECT conversations must include exactly one other participant' });
    }

    if (type === 'GROUP' && participants.length < 3) {
      return res.status(400).json({ message: 'GROUP conversations must include at least 2 other participants' });
    }

    for (const pid of participants) {
      if (String(pid) !== req.user.id && (await isBlocked(req.user.id, String(pid)))) {
        return res.status(403).json({ message: 'Blocked relationship prevents conversation' });
      }
    }

    if (type === 'DIRECT') {
      const existing = await Conversation.findOne({ type: 'DIRECT', participants: { $all: participants, $size: participants.length } });
      if (existing) return res.json({ conversation: existing });
    }

    // For groups, the creator is automatically an admin
    const admins = type === 'GROUP' ? [req.user.id] : [];

    const convo = await Conversation.create({
      type,
      title,
      description,
      participants,
      createdBy: req.user.id,
      admins,
      avatarUrl
    });

    await convo.populate('participants', 'username avatarUrl');
    res.json({ conversation: convo });
  } catch(e){ next(e); }
};

exports.addParticipants = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { participantIds } = req.body;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is admin for group conversations
    if (convo.type === 'GROUP' && !convo.admins.includes(req.user.id)) {
      return res.status(403).json({ message: 'Only group admins can add participants' });
    }

    // Check if conversation is direct (can't add to direct conversations)
    if (convo.type === 'DIRECT') {
      return res.status(400).json({ message: 'Cannot add participants to direct conversations' });
    }

    // Validate new participants
    const newParticipants = participantIds.filter(pid =>
      !convo.participants.includes(pid) && String(pid) !== String(req.user.id)
    );

    if (newParticipants.length === 0) {
      return res.status(400).json({ message: 'No valid new participants to add' });
    }

    // Check for blocked relationships
    for (const pid of newParticipants) {
      if (await isBlocked(req.user.id, String(pid))) {
        return res.status(403).json({ message: 'Blocked relationship prevents adding this participant' });
      }
    }

    // Add new participants
    convo.participants.push(...newParticipants);
    await convo.save();

    await convo.populate('participants', 'username avatarUrl');
    res.json({ conversation: convo });
  } catch(e) {
    next(e);
  }
};

exports.removeParticipant = async (req, res, next) => {
  try {
    const { conversationId, participantId } = req.params;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if conversation is direct (can't remove from direct conversations)
    if (convo.type === 'DIRECT') {
      return res.status(400).json({ message: 'Cannot remove participants from direct conversations' });
    }

    // Check if user is admin or trying to remove themselves
    const isAdmin = convo.admins.includes(req.user.id);
    const isSelf = String(participantId) === String(req.user.id);

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Only group admins can remove other participants' });
    }

    // Check if participant is in conversation
    if (!convo.participants.includes(participantId)) {
      return res.status(400).json({ message: 'Participant not found in conversation' });
    }

    // Prevent removing the last admin
    if (convo.admins.length === 1 && convo.admins[0].toString() === participantId && !isSelf) {
      return res.status(400).json({ message: 'Cannot remove the only admin from a group' });
    }

    // Remove participant
    convo.participants = convo.participants.filter(p => String(p) !== participantId);

    // If removing an admin, remove from admins list too
    if (convo.admins.includes(participantId)) {
      convo.admins = convo.admins.filter(a => String(a) !== participantId);
    }

    await convo.save();

    await convo.populate('participants', 'username avatarUrl');
    res.json({ conversation: convo });
  } catch(e) {
    next(e);
  }
};

exports.pinConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { pin } = req.body;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of the conversation
    if (!convo.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    convo.isPinned = Boolean(pin);
    convo.pinnedBy = pin ? req.user.id : undefined;
    convo.updatedAt = new Date();

    await convo.save();
    res.json({ conversation: convo });
  } catch(e) {
    next(e);
  }
};

exports.archiveConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { archive } = req.body;

    const convo = await Conversation.findById(conversationId);
    if (!convo) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is part of the conversation
    if (!convo.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    convo.isArchived = Boolean(archive);
    await convo.save();
    res.json({ conversation: convo });
  } catch(e) {
    next(e);
  }
};
