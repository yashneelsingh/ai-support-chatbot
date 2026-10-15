import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectMongo } from './services/mongo.js';
import { connectPostgres, pool } from './services/postgres.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import ingestRoutes from './routes/ingest.js';
import analyticsRoutes from './routes/analytics.js';
import ticketRoutes from './routes/tickets.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { initializeSocket } from './socket.js';
import { ensureTextIndex } from './rag/vectorStore.js';
import helmet from 'helmet';
import { startReminderJob } from './jobs/reminderJob.js';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:8080,http://localhost:8000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const developmentOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];
const allowedOrigins = [
  ...new Set([
    ...configuredOrigins,
    ...(process.env.NODE_ENV === 'production' ? [] : developmentOrigins),
  ]),
];
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS');
    error.code = 'CORS_ORIGIN_DENIED';
    return callback(error);
  },
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));
app.use('/api/chat', rateLimiter);

app.use('/api/auth',      authRoutes);
app.use('/api/chat',      chatRoutes);
app.use('/api/ingest',    ingestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/tickets',   ticketRoutes);

app.get('/api/health', async (req, res) => {
  const databases = {
    mongodb: mongoose.connection.readyState === 1 ? 'up' : 'down',
    postgres: 'down',
  };

  try {
    await pool.query('SELECT 1');
    databases.postgres = 'up';
  } catch (err) {
    console.error('PostgreSQL health check failed:', err.message);
  }

  const healthy = Object.values(databases).every((status) => status === 'up');
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    databases,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'CORS_ORIGIN_DENIED') {
    return res.status(403).json({
      success: false,
      message: 'This client origin is not allowed to access the API',
    });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File exceeds the 20MB upload limit' });
  }
  res.status(500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error' 
  });
});

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});
initializeSocket(io);

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectMongo();
    await ensureTextIndex();  // Create keyword index once at startup
    await connectPostgres();
    startReminderJob();       // Start the daily reminder cron job
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('Backend startup failed:', err.message);
    await Promise.allSettled([mongoose.disconnect(), pool.end()]);
    process.exitCode = 1;
  }
})();

// Catch unhandled process errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
