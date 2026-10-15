import jwt from 'jsonwebtoken';

/**
 * Protects routes — verifies JWT from Authorization header.
 * Attaches decoded user payload to req.user.
 */
export const protect = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Restricts route to admin role only.
 * Must be used after protect middleware.
 */
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
};
