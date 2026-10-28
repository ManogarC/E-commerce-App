import express from 'express'
import bcrypt from 'bcryptjs'
import { query } from '../db.js'
import { authenticateToken, generateToken } from '../middleware/auth.js'

const router = express.Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' })
    }

    // Check if email already registered
    const existing = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()])
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [name.trim(), email.trim().toLowerCase(), passwordHash, 'user']
    )

    const user = result.rows[0]
    const { password_hash, ...safeUser } = user
    const token = generateToken(safeUser)

    res.status(201).json({ user: safeUser, token, message: 'Registration successful!' })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ message: 'Internal server error during registration.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const result = await query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()])
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid email or password.' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(400).json({ message: 'Invalid email or password.' })
    }

    const { password_hash, ...safeUser } = user
    const token = generateToken(safeUser)

    res.json({ user: safeUser, token, message: 'Login successful!' })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ message: 'Internal server error during login.' })
  }
})

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user })
})

export default router

