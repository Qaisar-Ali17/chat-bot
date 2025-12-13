const { Schema, model } = require('mongoose');

const conversationSchema = new Schema({
  type: { type: String, enum: ['DIRECT', 'GROUP'], required: true },
  title: { type: String },
  description: { type: String },
  participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admins: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  avatarUrl: { type: String },
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  pinnedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = model('Conversation', conversationSchema);
