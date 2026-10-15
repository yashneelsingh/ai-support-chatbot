import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { pool } from '../services/postgres.js';

const router = Router();

// All ticket routes require admin access
router.use(protect, adminOnly);

/**
 * GET /api/tickets — list all tickets (paginated)
 * Query params:
 *   - status: filter by status (open, assigned, resolved, closed)
 *   - page: page number (default 1)
 *   - limit: items per page (default 20)
 */
router.get('/', async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  if (!Number.isInteger(pageNumber) || pageNumber < 1)
    return res.status(400).json({ message: 'page must be a positive integer' });
  if (!Number.isInteger(limitNumber) || limitNumber < 1 || limitNumber > 100)
    return res.status(400).json({ message: 'limit must be an integer between 1 and 100' });
  if (status && !['open', 'assigned', 'resolved', 'closed'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });

  const offset = (pageNumber - 1) * limitNumber;

  try {
    let whereClause = '';
    const params = [];

    if (status) {
      params.push(status);
      whereClause = `WHERE t.status = $${params.length}`;
    }

    // Get total count for pagination
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM tickets t ${whereClause}`,
      params
    );

    // Fetch tickets sorted by priority (urgent first) then by newest
    const priorityOrder = "CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END";
    const { rows: tickets } = await pool.query(
      `SELECT t.id, t.session_id, t.summary, t.status, t.priority,
              t.created_at, t.resolved_at,
              u.name AS user_name, u.email AS user_email,
              a.name AS assigned_to_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.assigned_to
       ${whereClause}
       ORDER BY ${priorityOrder}, t.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitNumber, offset]
    );

    res.json({
      tickets,
      pagination: {
        total: parseInt(countRows[0].total),
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(parseInt(countRows[0].total) / limitNumber),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tickets/:id — get a single ticket with full conversation context
 */
router.get('/:id', async (req, res, next) => {
  if (!Number.isInteger(Number(req.params.id)))
    return res.status(400).json({ message: 'Invalid ticket ID' });

  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS user_name, u.email AS user_email,
              a.name AS assigned_to_name
       FROM tickets t
       LEFT JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.assigned_to
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: 'Ticket not found' });

    res.json({ ticket: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tickets/:id — update ticket status / assignment
 * Body: { status?, priority?, assigned_to? }
 */
router.patch('/:id', async (req, res, next) => {
  const { status, priority, assigned_to } = req.body;
  const ticketId = req.params.id;

  if (!Number.isInteger(Number(ticketId)))
    return res.status(400).json({ message: 'Invalid ticket ID' });
  if (status && !['open', 'assigned', 'resolved', 'closed'].includes(status))
    return res.status(400).json({ message: 'Invalid status' });
  if (priority && !['low', 'medium', 'high', 'urgent'].includes(priority))
    return res.status(400).json({ message: 'Invalid priority' });

  try {
    // Verify ticket exists
    const { rows: existing } = await pool.query(
      'SELECT id, status FROM tickets WHERE id = $1',
      [ticketId]
    );
    if (existing.length === 0)
      return res.status(404).json({ message: 'Ticket not found' });

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (status) {
      updates.push(`status = $${paramIdx++}`);
      params.push(status);

      // Auto-set resolved_at when resolving/closing
      if (['resolved', 'closed'].includes(status) && !['resolved', 'closed'].includes(existing[0].status)) {
        updates.push(`resolved_at = NOW()`);
      } else if (!['resolved', 'closed'].includes(status) && ['resolved', 'closed'].includes(existing[0].status)) {
        updates.push(`resolved_at = NULL`);
      }
    }

    if (priority) {
      updates.push(`priority = $${paramIdx++}`);
      params.push(priority);
    }

    if (assigned_to !== undefined) {
      if (assigned_to !== null && (!Number.isInteger(Number(assigned_to)) || Number(assigned_to) < 1))
        return res.status(400).json({ message: 'assigned_to must be a positive user ID or null' });
      updates.push(`assigned_to = $${paramIdx++}`);
      params.push(assigned_to === null ? null : Number(assigned_to));

      // Auto-set status to 'assigned' if currently 'open'
      if (existing[0].status === 'open' && !status) {
        updates.push(`status = 'assigned'`);
      }
    }

    if (updates.length === 0)
      return res.status(400).json({ message: 'No update fields provided' });

    params.push(ticketId);
    const { rows } = await pool.query(
      `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    res.json({ ticket: rows[0], message: 'Ticket updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
