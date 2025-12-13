const jwt = require('jsonwebtoken');

function sign(payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d', opts = {}){
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn, ...opts });
}

function verify(token){
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { sign, verify };
