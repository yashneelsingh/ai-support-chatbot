import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getAgentExecutor } from '../rag/agent.js';
import Session from '../models/Session.js';
import { pool } from '../services/postgres.js';
import { getIo } from '../socket.js';
import { escalateToHumanTool } from '../rag/tools.js';

const router = Router();

// POST /api/chat — main chat endpoint (public, rate-limited)
router.post('/', async (req, res, next) => {
  const { message, sessionId = uuid() } = req.body;

  if (typeof message !== 'string' || !message.trim())
    return res.status(400).json({ message: 'Message cannot be empty' });
  if (message.length > 5000)
    return res.status(400).json({ message: 'Message exceeds maximum length of 5000 characters' });
  if (typeof sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(sessionId))
    return res.status(400).json({ message: 'Invalid session ID' });

  try {
    // Get or create the Agent Executor for this session
    let botReply;
    try {
      const executor = await getAgentExecutor(sessionId);
      const result   = await executor.invoke({ input: message });
      botReply = result.output;
    } catch (aiError) {
      console.warn("AI Agent failed (likely Quota/429 or Model/404). Falling back to simulated response.", aiError.message);
      
      const escalation = await escalateToHumanTool.invoke({
        issueSummary: `AI fallback for customer message: ${message.slice(0, 500)}`,
        sessionId,
      });
      botReply = `I'm temporarily unable to answer reliably, so I've escalated your request to a human agent. ${escalation} [FALLBACK_MODE]`;
    }

    // If the agent decided to escalate, notify admins via socket
    if (botReply.includes("ESCALATION_TRIGGERED")) {
      try {
        const io = getIo();
        io.to('admins').emit('handoff_alert', { sessionId, message: 'Agent escalated to human.' });
      } catch (_) { /* socket may not be initialized in some contexts */ }
    }

    // Save Q&A to MongoDB chat history
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: message },
              { role: 'bot',  content: botReply },
            ],
          },
        },
      },
      { upsert: true, new: true }
    );

    // Log session in PostgreSQL (for analytics)
    await pool.query(
      `INSERT INTO sessions (session_id) VALUES ($1) ON CONFLICT (session_id) DO NOTHING`,
      [sessionId]
    );

    res.json({ sessionId, reply: botReply });

  } catch (err) {
    console.error('Chat error stack:', err.stack);
    next(err);
  }
});

// GET /api/chat/:sessionId — fetch full chat history
router.get('/:sessionId', async (req, res, next) => {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(req.params.sessionId))
    return res.status(400).json({ message: 'Invalid session ID' });
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ messages: session.messages });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/feedback — thumbs up / down on a bot reply
router.post('/feedback', async (req, res, next) => {
  const { sessionId, messageId, rating } = req.body;
  if (typeof sessionId !== 'string' || !sessionId || !rating)
    return res.status(400).json({ message: 'sessionId and rating are required' });
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(sessionId))
    return res.status(400).json({ message: 'Invalid session ID' });
  if (messageId != null && (typeof messageId !== 'string' || messageId.length > 100))
    return res.status(400).json({ message: 'Invalid message ID' });
  if (!['up', 'down'].includes(rating))
    return res.status(400).json({ message: 'Invalid rating value' });

  try {
    await pool.query(
      `INSERT INTO feedback (session_id, message_id, rating) VALUES ($1, $2, $3)`,
      [sessionId, messageId ?? null, rating]
    );
    res.json({ message: 'Feedback saved. Thank you!' });
  } catch (err) {
    next(err);
  }
});

export default router;
