const mongoose = require('mongoose');

let retryTimer = null;

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[DB] MONGO_URI is not set. Server will run without database.');
    return false;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    return true;
  } catch (err) {
    console.error('[DB] Initial MongoDB connection failed:', err.message);
    scheduleRetry(uri);
    // Do not throw to prevent server crash
    return false;
  }
}

function scheduleRetry(uri){
  if (retryTimer) return; // already scheduled
  const RETRY_MS = 15000; // retry every 15s
  console.warn(`[DB] Will retry MongoDB connection in ${Math.round(RETRY_MS/1000)}s...`);
  retryTimer = setTimeout(async () => {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected on retry');
      clearTimeout(retryTimer); retryTimer = null;
    } catch (err) {
      console.error('[DB] MongoDB retry failed:', err.message);
      clearTimeout(retryTimer); retryTimer = null;
      scheduleRetry(uri);
    }
  }, RETRY_MS);
}

module.exports = { connectDB };
