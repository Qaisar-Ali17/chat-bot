const { verify } = require('../services/tokenService');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const payload = verify(token);
    req.user = { id: payload.id };
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
