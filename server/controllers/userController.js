const User = require('../models/User');
const Block = require('../models/Block');

exports.list = async (req, res, next) => {
  try{
    // Get all users except the current user
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('_id username email avatarUrl')
      .sort({ username: 1 });
    res.json({ users });
  } catch(e){ next(e); }
};

exports.search = async (req, res, next) => {
  try{
    const q = (req.query.q || '').trim();
    const users = await User.find({ username: new RegExp(q, 'i') }).select('id username avatarUrl').limit(20);
    res.json({ users });
  } catch(e){ next(e); }
};

exports.block = async (req, res, next) => {
  try{
    const blockedId = req.params.id;
    await Block.updateOne({ blocker: req.user.id, blocked: blockedId }, { $set: { blocker: req.user.id, blocked: blockedId } }, { upsert: true });
    res.json({ ok: true });
  } catch(e){ next(e); }
};

exports.unblock = async (req, res, next) => {
  try{
    const blockedId = req.params.id;
    await Block.deleteOne({ blocker: req.user.id, blocked: blockedId });
    res.json({ ok: true });
  } catch(e){ next(e); }
};

exports.updateProfile = async (req, res, next) => {
  try{
    const { avatarUrl } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatarUrl },
      { new: true, projection: 'id username email avatarUrl' }
    );
    res.json({ user });
  } catch(e){ next(e); }
};
