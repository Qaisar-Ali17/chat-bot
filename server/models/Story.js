const { Schema, model } = require('mongoose');

const attachmentSchema = new Schema({
  fileName: String,
  fileType: String,
  fileSize: Number,
  url: String,
  thumbUrl: String
}, { _id: false });

const storySchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, maxlength: 500 },
  media: [attachmentSchema],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

// automatically remove expired stories
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model('Story', storySchema);

