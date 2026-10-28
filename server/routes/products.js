import express from 'express'
import { query } from '../db.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import productCache from '../cache/productCache.js'

const router = express.Router()

// GET /api/products/cache/stats
router.get('/cache/stats', (req, res) => {
  res.json(productCache.getStats())
})

// GET /api/products/flash-sale (Fast retrieval for Flash Sale event)
router.get('/flash-sale', async (req, res) => {
  try {
    const cached = productCache.get('flash_sale_product')
    if (cached) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached)
    }

    const result = await query('SELECT * FROM products ORDER BY created_at DESC')
    const flashProduct = result.rows.find((p) => p.name?.includes('500 Units')) || result.rows[0]

    if (flashProduct) {
      productCache.set('flash_sale_product', flashProduct, 5000) // 5s hot cache for live stock
    }

    res.setHeader('X-Cache', 'MISS')
    res.json(flashProduct || null)
  } catch (err) {
    console.error('Flash sale product error:', err)
    res.status(500).json({ message: 'Failed to fetch flash sale product.' })
  }
})

// GET /api/products (supports ?category=... and ?search=...)
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query
    const isUnfiltered = (!category || category === 'All') && (!search || !search.trim())

    let products = null

    // Check high-speed cache for unfiltered catalog requests
    if (isUnfiltered) {
      products = productCache.get('catalog_all')
      if (products) {
        res.setHeader('X-Cache', 'HIT')
        return res.json(products)
      }
    }

    const result = await query('SELECT * FROM products ORDER BY created_at DESC')
    products = result.rows

    if (isUnfiltered) {
      productCache.set('catalog_all', products)
      res.setHeader('X-Cache', 'MISS')
    }

    if (category && category !== 'All') {
      products = products.filter((p) => p.category?.toLowerCase() === category.toLowerCase())
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      products = products.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q)
      )
    }

    res.json(products)
  } catch (err) {
    console.error('Fetch products error:', err)
    res.status(500).json({ message: 'Failed to fetch products.' })
  }
})

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const cacheKey = `product_${id}`
    const cached = productCache.get(cacheKey)

    if (cached) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached)
    }

    const result = await query('SELECT * FROM products WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    const product = result.rows[0]
    productCache.set(cacheKey, product)
    res.setHeader('X-Cache', 'MISS')
    res.json(product)
  } catch (err) {
    console.error('Fetch product by ID error:', err)
    res.status(500).json({ message: 'Failed to retrieve product.' })
  }
})

// POST /api/products (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, image_url, stock, rating, reviewCount } = req.body
    if (!name || !price || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required.' })
    }

    const img = imageUrl || image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'

    const result = await query(
      'INSERT INTO products (name, description, price, category, image_url, stock, rating, review_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [
        name,
        description || '',
        parseFloat(price),
        category,
        img,
        parseInt(stock || 10, 10),
        parseFloat(rating || 4.5),
        parseInt(reviewCount || 0, 10),
      ]
    )

    // Invalidate product caches
    productCache.flush()

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error('Create product error:', err)
    res.status(500).json({ message: 'Failed to create product.' })
  }
})

// PUT /api/products/:id (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, price, category, imageUrl, image_url, stock, rating } = req.body

    const img = imageUrl || image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'

    const result = await query(
      'UPDATE products SET name = $1, description = $2, price = $3, category = $4, image_url = $5, stock = $6, rating = $7 WHERE id = $8 RETURNING *',
      [
        name,
        description || '',
        parseFloat(price),
        category,
        img,
        parseInt(stock || 10, 10),
        parseFloat(rating || 4.5),
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' })
    }

    // Invalidate product caches
    productCache.flush()

    res.json(result.rows[0])
  } catch (err) {
    console.error('Update product error:', err)
    res.status(500).json({ message: 'Failed to update product.' })
  }
})

// DELETE /api/products/:id (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    await query('DELETE FROM products WHERE id = $1', [id])

    // Invalidate product caches
    productCache.flush()

    res.json({ message: 'Product deleted successfully.' })
  } catch (err) {
    console.error('Delete product error:', err)
    res.status(500).json({ message: 'Failed to delete product.' })
  }
})

export default router
