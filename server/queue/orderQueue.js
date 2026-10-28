import crypto from 'crypto'
import { query } from '../db.js'
import productCache from '../cache/productCache.js'

/**
 * High-Concurrency Asynchronous Order Processing Queue & Sequential Worker
 * - Decouples heavy database writes from the HTTP request-response cycle
 * - Guarantees sequential atomic inventory decrement with condition `stock >= qty`
 * - Caches and deduplicates requests via Idempotency Keys
 */

class OrderProcessingQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
    this.jobStatusMap = new Map() // orderId -> job status & result
    this.idempotencyMap = new Map() // idempotencyKey -> { orderId, status, result, timestamp }
    this.stats = {
      enqueued: 0,
      completed: 0,
      soldOut: 0,
      failed: 0,
      duplicatesBlocked: 0,
    }

    // Start background worker loop
    this.startWorker()
  }

  /**
   * Enqueue order into processing queue with Idempotency Key validation
   */
  enqueueOrder({ user, items, total, customerName, phone, shippingAddress, idempotencyKey }) {
    // 1. Idempotency Check
    if (idempotencyKey && this.idempotencyMap.has(idempotencyKey)) {
      const cached = this.idempotencyMap.get(idempotencyKey)
      this.stats.duplicatesBlocked++
      console.log(`⚡ Idempotency hit! Blocked duplicate order request for key: ${idempotencyKey}`)
      return {
        isDuplicate: true,
        orderId: cached.orderId,
        status: cached.status,
        data: cached.result,
        message: 'Duplicate request intercepted by Idempotency Guard.',
      }
    }

    // 2. Generate unique order ID
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase()

    const job = {
      jobId: 'job_' + crypto.randomBytes(4).toString('hex'),
      orderId,
      idempotencyKey,
      user,
      items,
      total: parseFloat(total),
      customerName,
      phone,
      shippingAddress,
      status: 'queued', // queued | processing | confirmed | sold_out | failed
      queuePosition: this.queue.length + 1,
      createdAt: new Date().toISOString(),
      result: null,
      error: null,
    }

    // Store in status map
    this.jobStatusMap.set(orderId, job)

    // Store in idempotency map
    if (idempotencyKey) {
      this.idempotencyMap.set(idempotencyKey, {
        orderId,
        status: 'queued',
        result: null,
        timestamp: Date.now(),
      })
    }

    // Push to queue
    this.queue.push(job)
    this.stats.enqueued++

    // Trigger worker if idle
    this.triggerWorker()

    return {
      isDuplicate: false,
      orderId,
      status: 'queued',
      queuePosition: job.queuePosition,
      estimatedWaitMs: this.queue.length * 80,
      message: 'Order accepted into high-concurrency queue. Processing asynchronously.',
    }
  }

  /**
   * Get real-time status of a queued order
   */
  getOrderStatus(orderId) {
    const job = this.jobStatusMap.get(orderId)
    if (!job) return null

    // Compute live position if still queued
    let livePosition = 0
    if (job.status === 'queued') {
      const idx = this.queue.findIndex((j) => j.orderId === orderId)
      livePosition = idx >= 0 ? idx + 1 : 1
    }

    return {
      orderId: job.orderId,
      status: job.status,
      queuePosition: livePosition,
      createdAt: job.createdAt,
      processedAt: job.processedAt || null,
      data: job.result,
      error: job.error,
    }
  }

  /**
   * Start worker loop
   */
  startWorker() {
    setInterval(() => {
      this.triggerWorker()
    }, 50)
  }

  async triggerWorker() {
    if (this.isProcessing || this.queue.length === 0) return
    this.isProcessing = true

    while (this.queue.length > 0) {
      const job = this.queue.shift()
      job.status = 'processing'
      this.jobStatusMap.set(job.orderId, job)

      try {
        await this.processJob(job)
      } catch (err) {
        console.error(`Queue worker failed for order ${job.orderId}:`, err)
        job.status = 'failed'
        job.error = err.message || 'Internal queue processing error'
        this.stats.failed++
        this.updateIdempotency(job)
      }

      // Small tick between orders for event-loop breathing
      await new Promise((r) => setImmediate(r))
    }

    this.isProcessing = false
  }

  /**
   * Core atomic order execution
   */
  async processJob(job) {
    const { orderId, user, items, total, customerName, phone, shippingAddress } = job
    const decrementedProducts = []

    // 1. Strict Atomic Inventory Reservation with condition: stock >= requested_qty
    for (const item of items) {
      const pId = item.id || item.productId
      const qty = parseInt(item.qty || 1, 10)

      // Query database for authoritative atomic decrement
      const decrementSql = 'UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING *'
      const decRes = await query(decrementSql, [qty, pId])

      if (decRes.rowCount === 0) {
        // Stock condition failed! Item is sold out or insufficient stock remaining
        console.warn(`⚡ Sold out condition hit for Product #${pId} during order ${orderId}!`)

        // Roll back any previously decremented items in this transaction
        for (const rb of decrementedProducts) {
          await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [rb.qty, rb.id])
        }

        job.status = 'sold_out'
        job.error = `Sorry, "${item.name}" just sold out! Stock limit reached.`
        job.processedAt = new Date().toISOString()
        this.stats.soldOut++
        this.updateIdempotency(job)
        return
      }

      decrementedProducts.push({ id: pId, qty })
    }

    // 2. Persist Order to DB
    const addressStr = typeof shippingAddress === 'object'
      ? `${shippingAddress.address || ''}, ${shippingAddress.city || ''} - ${shippingAddress.pincode || ''}`
      : String(shippingAddress || 'Standard Delivery')

    const orderRes = await query(
      'INSERT INTO orders (id, user_id, user_email, customer_name, shipping_address, phone, total, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        orderId,
        user.id,
        user.email,
        customerName || user.name || 'Valued Customer',
        addressStr,
        phone || '',
        total,
        'confirmed',
      ]
    )

    const savedOrder = orderRes.rows[0]
    const savedItems = []

    // 3. Persist Order Items
    for (const item of items) {
      const pId = item.id || item.productId || null
      const pName = item.name || 'Product'
      const price = parseFloat(item.price || 0)
      const qty = parseInt(item.qty || 1, 10)
      const img = item.imageUrl || item.image_url || ''

      const itemRes = await query(
        'INSERT INTO order_items (order_id, product_id, product_name, price, qty, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [orderId, pId, pName, price, qty, img]
      )
      savedItems.push(itemRes.rows[0])
    }

    // 4. Invalidate hot cache so subsequent product reads reflect the new stock
    productCache.flush()

    // 5. Finalize Job Status
    job.status = 'confirmed'
    job.result = {
      ...savedOrder,
      items: savedItems,
    }
    job.processedAt = new Date().toISOString()
    this.stats.completed++
    this.updateIdempotency(job)
  }

  updateIdempotency(job) {
    if (job.idempotencyKey) {
      this.idempotencyMap.set(job.idempotencyKey, {
        orderId: job.orderId,
        status: job.status,
        result: job.result,
        error: job.error,
        timestamp: Date.now(),
      })
    }
  }

  getStats() {
    return {
      ...this.stats,
      currentQueueLength: this.queue.length,
      isProcessing: this.isProcessing,
      trackedIdempotencyKeys: this.idempotencyMap.size,
    }
  }
}

export const orderQueue = new OrderProcessingQueue()
export default orderQueue

