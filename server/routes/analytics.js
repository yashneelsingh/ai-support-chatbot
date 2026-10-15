import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { pool } from '../services/postgres.js';
import Session from '../models/Session.js';

const router = Router();

// GET /api/analytics/summary — comprehensive platform stats for admin dashboard
router.get('/summary', protect, adminOnly, async (req, res, next) => {
  try {
    // ── Core Metrics ──────────────────────────────────────────────────────
    const { rows: sessionCount } = await pool.query(
      'SELECT COUNT(*) AS total FROM sessions'
    );

    const { rows: feedbackStats } = await pool.query(
      `SELECT rating, COUNT(*) AS count FROM feedback GROUP BY rating`
    );

    const totalMessages = await Session.aggregate([
      { $project: { count: { $size: '$messages' } } },
      { $group: { _id: null, total: { $sum: '$count' } } },
    ]);

    const docsCount = await Session.db.db
      .collection('doc_vectors')
      .distinct('metadata.source');

    // ── Ticket Metrics ────────────────────────────────────────────────────

    // Total tickets and breakdown by status
    const { rows: ticketStatusBreakdown } = await pool.query(
      `SELECT status, COUNT(*) AS count FROM tickets GROUP BY status ORDER BY count DESC`
    );

    const { rows: totalTickets } = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets`
    );

    // Ticket volume over time (last 30 days, grouped by day)
    const { rows: ticketVolumeOverTime } = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM tickets
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at)`
    );

    // Escalation rate: tickets / total sessions
    const totalSessions = parseInt(sessionCount[0].total) || 1;
    const ticketTotal = parseInt(totalTickets[0].total) || 0;
    const escalationRate = ((ticketTotal / totalSessions) * 100).toFixed(1);

    // Average resolution time (for resolved/closed tickets)
    const { rows: avgResolution } = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS avg_hours
       FROM tickets
       WHERE resolved_at IS NOT NULL`
    );
    const avgResolutionHours = avgResolution[0].avg_hours
      ? parseFloat(avgResolution[0].avg_hours).toFixed(1)
      : null;

    // ── Query Topic Analysis ──────────────────────────────────────────────
    // Extract most common words from user messages (simple term frequency)
    let topQueryTopics = [];
    try {
      const recentSessions = await Session.find(
        {},
        { messages: 1 }
      ).sort({ updatedAt: -1 }).limit(100);

      const wordFreq = {};
      const stopWords = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
        'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'up', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again',
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
        'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
        'too', 'very', 'just', 'because', 'as', 'until', 'while', 'and',
        'but', 'or', 'if', 'it', 'its', 'this', 'that', 'these', 'those',
        'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they',
        'what', 'which', 'who', 'whom', 'hi', 'hello', 'please', 'thanks',
        'thank', 'want', 'get', 'know', 'like',
      ]);

      for (const session of recentSessions) {
        for (const msg of session.messages) {
          if (msg.role !== 'user') continue;
          const words = msg.content.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
          for (const word of words) {
            wordFreq[word] = (wordFreq[word] || 0) + 1;
          }
        }
      }

      topQueryTopics = Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([topic, count]) => ({ topic, count }));
    } catch (topicErr) {
      console.warn('Topic analysis failed:', topicErr.message);
    }

    // ── RAG Retrieval Hit Rate ─────────────────────────────────────────────
    // Estimate from MongoDB sessions: count bot replies that say "no relevant information"
    let ragHitRate = null;
    try {
      const allSessions = await Session.find({}, { messages: 1 }).limit(200);
      let totalBotReplies = 0;
      let ragMisses = 0;
      for (const session of allSessions) {
        for (const msg of session.messages) {
          if (msg.role !== 'bot') continue;
          totalBotReplies++;
          if (msg.content.toLowerCase().includes('no relevant information found')) {
            ragMisses++;
          }
        }
      }
      if (totalBotReplies > 0) {
        ragHitRate = (((totalBotReplies - ragMisses) / totalBotReplies) * 100).toFixed(1);
      }
    } catch (ragErr) {
      console.warn('RAG hit rate calculation failed:', ragErr.message);
    }

    res.json({
      totalSessions: parseInt(sessionCount[0].total),
      totalMessages: totalMessages[0]?.total ?? 0,
      totalDocs: docsCount.length,
      feedback: feedbackStats,
      tickets: {
        total: ticketTotal,
        statusBreakdown: ticketStatusBreakdown,
        volumeOverTime: ticketVolumeOverTime,
        escalationRate: `${escalationRate}%`,
        avgResolutionHours,
      },
      topQueryTopics,
      ragHitRate: ragHitRate ? `${ragHitRate}%` : 'N/A',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
