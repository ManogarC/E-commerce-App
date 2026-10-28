import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import { seedDatabase } from './seed.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors())
app.use(express.json())

// Health route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ShopEase E-Commerce API',
  })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err)
  res.status(500).json({ message: 'Internal server error', error: err.message })
})

// Startup sequence
const startServer = async () => {
  try {
    await initDB()
    await seedDatabase()

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ShopEase Express Server running on http://localhost:${PORT}`)
      console.log(`📡 API Endpoints available at http://localhost:${PORT}/api`)
    })
  } catch (err) {
    console.error('Fatal server boot error:', err)
    process.exit(1)
  }
}

startServer()
