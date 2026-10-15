import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../services/postgres.js';
import { sendPasswordResetEmail } from '../services/email.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Apply stricter rate limiting to all auth endpoints
router.use(authRateLimiter);

// ─── Input Validation Helpers ────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates password strength.
 * Requirements: ≥8 chars, at least 1 uppercase, 1 lowercase, 1 digit.
 */
const validatePassword = (password) => {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit';
  return null;
};

// ─── Token Helpers ───────────────────────────────────────────────────────────

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }   // Short-lived access token
  );

const generateRefreshToken = () =>
  crypto.randomBytes(48).toString('hex');

const passwordResetResponse = {
  message: 'If an account exists for that email, a password reset link has been sent.',
};

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  const { name, email, password, role = 'user' } = req.body;

  // Input validation
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Name, email, and password are required' });

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ message: 'Name, email, and password must be strings' });

  if (!name.trim())
    return res.status(400).json({ message: 'Name cannot be empty' });

  if (name.trim().length > 100)
    return res.status(400).json({ message: 'Name must be 100 characters or fewer' });

  if (!EMAIL_REGEX.test(email))
    return res.status(400).json({ message: 'Please provide a valid email address' });

  const passwordError = validatePassword(password);
  if (passwordError)
    return res.status(400).json({ message: passwordError });

  // Only allow 'user' role from public registration (prevent privilege escalation)
  const safeRole = ['user'].includes(role) ? role : 'user';

  try {
    const hash = await bcrypt.hash(password, 12); // Increased rounds from 10 to 12
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name.trim(), email.trim().toLowerCase(), hash, safeRole]
    );
    res.status(201).json({ user: rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'Email already registered' });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });
  if (typeof email !== 'string' || typeof password !== 'string')
    return res.status(400).json({ message: 'Email and password must be strings' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store refresh token in DB
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, refreshToken, expiresAt]
    );

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh — exchange refresh token for a new access token
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: 'Refresh token is required' });

  try {
    // Look up the refresh token
    const { rows } = await pool.query(
      `SELECT rt.*, u.id AS user_id, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.revoked = FALSE AND rt.expires_at > NOW()`,
      [refreshToken]
    );

    if (rows.length === 0)
      return res.status(401).json({ message: 'Invalid or expired refresh token' });

    const tokenRecord = rows[0];

    // Issue new access token
    const newAccessToken = generateAccessToken({
      id: tokenRecord.user_id,
      role: tokenRecord.role,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout — revoke a refresh token
router.post('/logout', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: 'Refresh token is required' });

  try {
    await pool.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
      [refreshToken]
    );
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password — request a single-use reset link
router.post('/forgot-password', async (req, res, next) => {
  const { email } = req.body;

  if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim()))
    return res.status(400).json({ message: 'Please provide a valid email address' });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const { rows } = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [normalizedEmail],
    );
    const user = rows[0];

    // Email mode hides whether an account exists. Local screen mode is an
    // explicitly insecure demo convenience, so it can provide immediate feedback.
    if (!user) {
      if (process.env.PASSWORD_RESET_DELIVERY === 'screen') {
        return res.status(404).json({ message: 'No account was found for that email address' });
      }
      return res.json(passwordResetResponse);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 minutes')`,
      [user.id, tokenHash],
    );

    const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:8080')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');
    const resetUrl = `${clientOrigin}/reset-password?token=${token}`;

    if (process.env.PASSWORD_RESET_DELIVERY === 'screen') {
      return res.json({
        ...passwordResetResponse,
        delivery: 'screen',
        resetToken: token,
      });
    }

    try {
      await sendPasswordResetEmail({ email: user.email, name: user.name, resetUrl });
    } catch (emailError) {
      await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
      console.error('Password reset email failed:', emailError.message);
    }

    res.json({ ...passwordResetResponse, delivery: 'email' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password — consume a reset token and replace the password
router.post('/reset-password', async (req, res, next) => {
  const { token, password } = req.body;

  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token))
    return res.status(400).json({ message: 'Invalid or expired password reset link' });
  if (typeof password !== 'string')
    return res.status(400).json({ message: 'Password is required' });

  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await client.query(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash],
    );
    const resetToken = rows[0];

    if (!resetToken) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid or expired password reset link' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
    await client.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [resetToken.user_id],
    );
    await client.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [resetToken.user_id]);
    await client.query('COMMIT');

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client?.release();
  }
});

export default router;
