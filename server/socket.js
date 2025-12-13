const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const User = require('./models/User');
const { isBlocked } = require('./services/blockService');

module.exports = (httpServer) => {
  const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : '*';

  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try{
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;
      next();
    } catch(e){ next(new Error('unauthorized')); }
  });

  const safe = (handler) => async (...args) => {
    try {
      await handler(...args);
    } catch (err) {
      console.error('[socket] handler error', err);
    }
  };

  io.on('connection', (socket) => {
    socket.on('rooms:join', safe(async ({ conversationId }) => {
      const convo = await Conversation.findById(conversationId);
      if (!convo || !convo.participants.map(String).includes(socket.userId)) return;
      socket.join(conversationId);
    }));

    socket.on('typing', safe(({ conversationId }) => {
      socket.to(conversationId).emit('typing', { conversationId, userId: socket.userId });
    }));

    socket.on('message:send', safe(async ({ conversationId, content, attachments, recipientId }) => {
      // Handle auto conversation creation if recipientId is provided
      if (conversationId === 'auto' && recipientId) {
        // Find or create conversation
        let convo = await Conversation.findOne({
          participants: { $all: [socket.userId, recipientId] },
          isGroup: false
        });

        if (!convo) {
          const recipient = await User.findById(recipientId);
          if (!recipient) return;

          convo = await Conversation.create({
            type: 'DIRECT',
            participants: [socket.userId, recipientId],
            createdBy: socket.userId,
            title: `Chat between users`
          });
        }

        conversationId = convo._id;
      }

      const convo = await Conversation.findById(conversationId);
      if (!convo || !convo.participants.map(String).includes(socket.userId)) return;
      for (const pid of convo.participants){
        if (String(pid) !== socket.userId && (await isBlocked(socket.userId, String(pid)))) return;
      }
      if (!content && !(Array.isArray(attachments) && attachments.length)) return;
      const msg = await Message.create({
        conversation: conversationId,
        author: socket.userId,
        content: content || '',
        attachments: Array.isArray(attachments) ? attachments : []
      });
      convo.updatedAt = new Date();
      await convo.save();
      await msg.populate('author', 'username avatarUrl');
      io.to(conversationId).emit('message:new', { message: msg });
    }));
  });

  return io;
};
