const Block = require('../models/Block');

async function isBlocked(a, b){
  const found = await Block.findOne({ $or: [ { blocker: a, blocked: b }, { blocker: b, blocked: a } ] });
  return !!found;
}

async function blockedUserIdsFor(userId){
  const blocks = await Block.find({ $or: [ { blocker: userId }, { blocked: userId } ] }).select('blocker blocked').lean();
  const ids = new Set();
  blocks.forEach(b => {
    if (String(b.blocker) !== String(userId)) ids.add(String(b.blocker));
    if (String(b.blocked) !== String(userId)) ids.add(String(b.blocked));
  });
  return Array.from(ids);
}

module.exports = { isBlocked, blockedUserIdsFor };
