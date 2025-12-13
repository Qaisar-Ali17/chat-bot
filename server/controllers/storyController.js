const Story = require('../models/Story');
const { blockedUserIdsFor } = require('../services/blockService');

exports.list = async (req, res, next) => {
  try {
    const blockedIds = await blockedUserIdsFor(req.user.id);
    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      author: { $nin: blockedIds }
    })
      .populate('author', 'username avatarUrl')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ stories });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { text, media } = req.body || {};
    if (!text && !(Array.isArray(media) && media.length)) {
      return res.status(400).json({ message: 'Story requires text or media' });
    }
    const story = await Story.create({
      author: req.user.id,
      text: text || '',
      media: Array.isArray(media) ? media : []
    });
    await story.populate('author', 'username avatarUrl');
    res.status(201).json({ story });
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const story = await Story.findOne({ _id: id, author: req.user.id });
    if (!story) return res.status(404).json({ message: 'Story not found' });
    await story.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
};

