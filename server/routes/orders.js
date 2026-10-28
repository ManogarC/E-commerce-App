import express from 'express'
import { query } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { createRateLimiter, botProtection } from '../middleware/rateLimiter.js'
import orderQueue from '../queue/orderQueue.js'

const router = express.Router()

// Strict rate limiter for order submissions: max 25 attempts per 10 seconds
const orderRateLimiter = createRateLimiter({
  windowMs: 10000,
  max: 25,
  message: 'Order submission rate limit exceeded. Please wait a few seconds before retrying.',
})

// GET /api/orders/queue/stats (Expose real-time queue metrics)
router.get('/queue/stats', (req, res) => {
  res.json(orderQueue.getStats())
})

// GET /api/orders/:id/status (Poll tracking endpoint with exponential backoff support)
router.get('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params
  const statusInfo = orderQueue.getOrderStatus(id)

  if (!statusInfo) {
    return res.status(404).json({ message: 'Order job not found in active queue.' })
  }

  res.json(statusInfo)
})

// POST /api/orders (Decoupled Asynchronous Order Ingestion)
router.post('/', authenticateToken, orderRateLimiter, botProtection, (req, res) => {
  try {
    const { items, total, shippingAddress, phone, customerName } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart items are required to place an order.' })
    }

    // Extract Idempotency Key from header or body
    const idempotencyKey = req.headers['x-idempotency-key'] || req.body.idempotencyKey || null

    // Enqueue order asynchronously
    const queueResult = orderQueue.enqueueOrder({
      user: req.user,
      items,
      total,
      customerName,
      phone,
      shippingAddress,
      idempotencyKey,
    })

    if (queueResult.isDuplicate) {
      // Duplicate request caught by Idempotency Key!
      return res.status(200).json({
        id: queueResult.orderId,
        status: queueResult.status,
        isDuplicate: true,
        message: 'Duplicate request intercepted. Returning cached order session.',
        ...queueResult.data,
      })
    }

    // Return 202 Accepted immediately to decouple heavy DB writes
    res.status(202).json({
      id: queueResult.orderId,
      status: queueResult.status,
      queuePosition: queueResult.queuePosition,
      estimatedWaitMs: queueResult.estimatedWaitMs,
      checkStatusUrl: `/api/orders/${queueResult.orderId}/status`,
      message: queueResult.message,
    })
  } catch (err) {
    console.error('Order ingestion error:', err)
    res.status(500).json({ message: 'Failed to enqueue order.' })
  }
})

// GET /api/orders/my-orders (User orders from persistent storage)
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const ordersRes = await query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )

    const orders = []
    for (const ord of ordersRes.rows) {
      const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [ord.id])
      orders.push({
        ...ord,
        items: itemsRes.rows,
      })
    }

    res.json(orders)
  } catch (err) {
    console.error('Fetch user orders error:', err)
    res.status(500).json({ message: 'Failed to fetch your orders.' })
  }
})

// GET /api/orders/:id (Single order details)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check in-flight queue first
    const queuedJob = orderQueue.getOrderStatus(id)
    if (queuedJob && queuedJob.status === 'confirmed' && queuedJob.data) {
      return res.json(queuedJob.data)
    }

    const orderRes = await query('SELECT * FROM orders WHERE id = $1', [id])
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Order not found.' })
    }

    const order = orderRes.rows[0]

    // Only order owner or admin can view
    if (order.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized to view this order.' })
    }

    const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [id])
    res.json({
      ...order,
      items: itemsRes.rows,
    })
  } catch (err) {
    console.error('Fetch order by ID error:', err)
    res.status(500).json({ message: 'Failed to fetch order details.' })
  }
})

// GET /api/orders (Admin: all orders)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ordersRes = await query('SELECT * FROM orders ORDER BY created_at DESC')
    const orders = []

    for (const ord of ordersRes.rows) {
      const itemsRes = await query('SELECT * FROM order_items WHERE order_id = $1', [ord.id])
      orders.push({
        ...ord,
        items: itemsRes.rows,
      })
    }

    res.json(orders)
  } catch (err) {
    console.error('Admin fetch orders error:', err)
    res.status(500).json({ message: 'Failed to fetch all orders.' })
  }
})

// GET /api/orders/admin/stats (Admin: metrics)
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const prodCountRes = await query('SELECT COUNT(*) FROM products')
    const orderCountRes = await query('SELECT COUNT(*) FROM orders')
    const revRes = await query('SELECT SUM(total) FROM orders')

    const totalProducts = parseInt(prodCountRes.rows[0]?.count || 0, 10)
    const totalOrders = parseInt(orderCountRes.rows[0]?.count || 0, 10)
    const totalRevenue = parseFloat(revRes.rows[0]?.sum || 0)

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue,
      queueStats: orderQueue.getStats(),
    })
  } catch (err) {
    console.error('Fetch stats error:', err)
    res.status(500).json({ message: 'Failed to fetch statistics.' })
  }
})

export default router
