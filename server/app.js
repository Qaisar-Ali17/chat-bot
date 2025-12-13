const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const storyRoutes = require('./routes/storyRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Please set it in your environment.');
  process.exit(1);
}
connectDB();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// static
app.use('/server/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/', express.static(path.join(__dirname, '..', 'public')));

// favicon handling
app.get('/favicon.ico', (req, res) => res.status(204).end());

// api
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stories', storyRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(errorHandler);

const desiredPort = Number(process.env.PORT) || 4000;
const server = http.createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${desiredPort} is already in use. Stop the other process or set PORT to a free port.`);
  } else {
    console.error('Server failed to start:', err);
  }
  process.exit(1);
});

server.listen(desiredPort, () => {
  console.log(`Server listening on :${desiredPort}`);
  const io = require('./socket')(server);
  app.set('io', io);
});
