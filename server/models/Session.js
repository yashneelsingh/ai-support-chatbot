import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'bot'], required: true },
  content:   { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId:    { type: Number },   // optional — null for anonymous users
  messages:  [messageSchema],
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
