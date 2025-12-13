const { Schema, model } = require('mongoose');

const attachmentSchema = new Schema({
  fileName: String,
  fileType: String,
  fileSize: Number,
  url: String,
  thumbUrl: String
}, { _id: false });

const messageSchema = new Schema({
  conversation: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  content: { type: String },
  attachments: [attachmentSchema],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now }
  }],
  reactions: [{
    emoji: { type: String, required: true },
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }]
  }],
  quotedMessage: {
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    content: { type: String },
    author: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date }
  }
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ author: 1, createdAt: -1 });
messageSchema.index({ status: 1 });

module.exports = model('Message', messageSchema);
