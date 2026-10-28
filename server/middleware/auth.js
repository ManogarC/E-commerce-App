import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'shopease-super-secret-jwt-key-2026'

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. No token provided.' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const result = await query('SELECT * FROM users WHERE id = $1', [decoded.id])
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'User no longer exists.' })
    }
    const user = result.rows[0]
    const { password_hash, ...safeUser } = user
    req.user = safeUser
    next()
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' })
  }
}

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' })
  }
  next()
}

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

