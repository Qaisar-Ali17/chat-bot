const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sign } = require('../services/tokenService');

exports.register = async (req, res, next) => {
  try{
    const { email, username, password, avatarUrl } = req.body;
    if (!email || !username || !password) return res.status(400).json({ message: 'Missing fields' });
    const exists = await User.findOne({ $or: [ { email }, { username } ] });
    if (exists) return res.status(400).json({ message: 'Email or username already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, username, passwordHash, avatarUrl });
    const token = sign({ id: user.id });
    res.json({ token, user: { id: user.id, email, username, avatarUrl } });
  } catch(e){ next(e); }
};

exports.login = async (req, res, next) => {
  try{
    const { emailOrUsername, password, rememberMe } = req.body;
    if (!emailOrUsername || !password) return res.status(400).json({ message: 'Missing fields' });
    const user = await User.findOne({ $or: [ { email: emailOrUsername }, { username: emailOrUsername } ] });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    // Set token expiration based on rememberMe
    const token = sign({ id: user.id }, rememberMe ? '30d' : '7d');

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl
      }
    });
  } catch(e){ next(e); }
};

exports.me = async (req, res, next) => {
  try{
    const u = await User.findById(req.user.id).select('id email username avatarUrl createdAt');
    res.json({ user: u });
  } catch(e){ next(e); }
};
