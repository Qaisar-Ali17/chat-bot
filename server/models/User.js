const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  email: { type: String, unique: true, required: true, index: true },
  username: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  avatarUrl: { type: String }
}, { timestamps: true });

module.exports = model('User', userSchema);
