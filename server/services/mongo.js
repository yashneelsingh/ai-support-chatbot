import mongoose from 'mongoose';

export const connectMongo = async () => {
  try {
    const timeout = Number.parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '10000', 10);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: timeout,
      connectTimeoutMS: timeout,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB error:', err.message);
    throw err;
  }
};
