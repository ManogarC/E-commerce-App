import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, 'data')
const fallbackFilePath = path.join(dataDir, 'ecommerce_db.json')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const { Pool } = pg

// Default Postgres connection string or env variable
const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'ecommerce'}`

let pool = null
let useFallback = false

// Initialize fallback storage
const loadFallbackData = () => {
  if (fs.existsSync(fallbackFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'))
    } catch {
      // fallback to initial
    }
  }
  return {
    users: [],
    products: [],
    orders: [],
    order_items: [],
  }
}

let fallbackData = loadFallbackData()

const saveFallbackData = () => {
  try {
    fs.writeFileSync(fallbackFilePath, JSON.stringify(fallbackData, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save fallback data:', err)
  }
}

// Test PostgreSQL connection
export const initDB = async () => {
  try {
    console.log('Attempting PostgreSQL connection...')
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
    })

    // Probe connection
    const client = await pool.connect()
    console.log('✅ Connected to PostgreSQL database successfully!')

    // Create tables in PostgreSQL
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        category VARCHAR(100) NOT NULL,
        image_url TEXT,
        stock INT DEFAULT 10,
        rating NUMERIC(2, 1) DEFAULT 4.5,
        review_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE SET NULL,
        user_email VARCHAR(255) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        shipping_address TEXT NOT NULL,
        phone VARCHAR(50),
        total NUMERIC(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
        product_id INT,
        product_name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        qty INT NOT NULL,
        image_url TEXT
      );
    `)
    client.release()
    useFallback = false
  } catch (err) {
    console.warn('⚠️  PostgreSQL server is not active or connection failed:', err.message)
    console.log('🔄 Activating zero-config embedded PostgreSQL demo engine (data persists to server/data/ecommerce_db.json)')
    useFallback = true
  }
}

// Unified query executor supporting both PostgreSQL and Demo engine
export const query = async (sqlText, params = []) => {
  if (!useFallback && pool) {
    try {
      const res = await pool.query(sqlText, params)
      return res
    } catch (err) {
      console.warn('PG error, using fallback:', err.message)
    }
  }

  // --- Fallback Demo Engine handling ---
  const normalizedSql = sqlText.trim().replace(/\s+/g, ' ')

  // 1. Users Queries
  if (/^SELECT \* FROM users WHERE email = \$1/i.test(normalizedSql)) {
    const user = fallbackData.users.find((u) => u.email.toLowerCase() === params[0].toLowerCase())
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  if (/^SELECT \* FROM users WHERE id = \$1/i.test(normalizedSql)) {
    const user = fallbackData.users.find((u) => u.id === Number(params[0]))
    return { rows: user ? [user] : [], rowCount: user ? 1 : 0 }
  }

  if (/^INSERT INTO users/i.test(normalizedSql)) {
    const id = fallbackData.users.length ? Math.max(...fallbackData.users.map((u) => u.id)) + 1 : 1
    const newUser = {
      id,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'user',
      created_at: new Date().toISOString(),
    }
    fallbackData.users.push(newUser)
    saveFallbackData()
    return { rows: [newUser], rowCount: 1 }
  }

  // 2. Products Queries
  if (/^SELECT \* FROM products ORDER BY created_at DESC/i.test(normalizedSql)) {
    const sorted = [...fallbackData.products].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )
    return { rows: sorted, rowCount: sorted.length }
  }

  if (/^SELECT \* FROM products WHERE id = \$1/i.test(normalizedSql)) {
    const prod = fallbackData.products.find((p) => p.id === Number(params[0]))
    return { rows: prod ? [prod] : [], rowCount: prod ? 1 : 0 }
  }

  if (/^INSERT INTO products/i.test(normalizedSql)) {
    const id = fallbackData.products.length ? Math.max(...fallbackData.products.map((p) => p.id)) + 1 : 1
    const newProd = {
      id,
      name: params[0],
      description: params[1],
      price: parseFloat(params[2]),
      category: params[3],
      image_url: params[4],
      stock: parseInt(params[5] || 0, 10),
      rating: parseFloat(params[6] || 4.5),
      review_count: parseInt(params[7] || 0, 10),
      created_at: new Date().toISOString(),
    }
    fallbackData.products.unshift(newProd)
    saveFallbackData()
    return { rows: [newProd], rowCount: 1 }
  }

  // Atomic Conditional Stock Decrement (Flash Sale Guard: strictly sell only remaining stock)
  if (/UPDATE products SET stock = stock - \$1 WHERE id = \$2 AND stock >= \$1/i.test(normalizedSql)) {
    const qty = parseInt(params[0], 10)
    const id = Number(params[1])
    const product = fallbackData.products.find((p) => p.id === id)

    if (product && product.stock >= qty) {
      product.stock -= qty
      saveFallbackData()
      return { rows: [product], rowCount: 1 }
    }
    // Condition failed: stock < qty (item is sold out or insufficient stock)
    return { rows: [], rowCount: 0 }
  }

  // Atomic Stock Rollback
  if (/UPDATE products SET stock = stock \+ \$1 WHERE id = \$2/i.test(normalizedSql)) {
    const qty = parseInt(params[0], 10)
    const id = Number(params[1])
    const product = fallbackData.products.find((p) => p.id === id)

    if (product) {
      product.stock += qty
      saveFallbackData()
      return { rows: [product], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  }

  if (/^UPDATE products SET/i.test(normalizedSql)) {
    const id = Number(params[params.length - 1])
    const index = fallbackData.products.findIndex((p) => p.id === id)
    if (index !== -1) {
      fallbackData.products[index] = {
        ...fallbackData.products[index],
        name: params[0],
        description: params[1],
        price: parseFloat(params[2]),
        category: params[3],
        image_url: params[4],
        stock: parseInt(params[5], 10),
        rating: parseFloat(params[6]),
      }
      saveFallbackData()
      return { rows: [fallbackData.products[index]], rowCount: 1 }
    }
    return { rows: [], rowCount: 0 }
  }

  if (/^DELETE FROM products WHERE id = \$1/i.test(normalizedSql)) {
    const id = Number(params[0])
    fallbackData.products = fallbackData.products.filter((p) => p.id !== id)
    saveFallbackData()
    return { rows: [], rowCount: 1 }
  }

  // 3. Orders Queries
  if (/^INSERT INTO orders/i.test(normalizedSql)) {
    const newOrder = {
      id: params[0],
      user_id: params[1] ? Number(params[1]) : null,
      user_email: params[2],
      customer_name: params[3],
      shipping_address: params[4],
      phone: params[5],
      total: parseFloat(params[6]),
      status: params[7] || 'confirmed',
      created_at: new Date().toISOString(),
    }
    fallbackData.orders.unshift(newOrder)
    saveFallbackData()
    return { rows: [newOrder], rowCount: 1 }
  }

  if (/^INSERT INTO order_items/i.test(normalizedSql)) {
    const id = fallbackData.order_items.length ? Math.max(...fallbackData.order_items.map((i) => i.id)) + 1 : 1
    const newItem = {
      id,
      order_id: params[0],
      product_id: params[1] ? Number(params[1]) : null,
      product_name: params[2],
      price: parseFloat(params[3]),
      qty: parseInt(params[4], 10),
      image_url: params[5],
    }
    fallbackData.order_items.push(newItem)
    saveFallbackData()
    return { rows: [newItem], rowCount: 1 }
  }

  if (/^SELECT \* FROM orders WHERE user_id = \$1 ORDER BY created_at DESC/i.test(normalizedSql)) {
    const userOrders = fallbackData.orders.filter((o) => o.user_id === Number(params[0]))
    return { rows: userOrders, rowCount: userOrders.length }
  }

  if (/^SELECT \* FROM orders ORDER BY created_at DESC/i.test(normalizedSql)) {
    return { rows: fallbackData.orders, rowCount: fallbackData.orders.length }
  }

  if (/^SELECT \* FROM orders WHERE id = \$1/i.test(normalizedSql)) {
    const order = fallbackData.orders.find((o) => o.id === params[0])
    return { rows: order ? [order] : [], rowCount: order ? 1 : 0 }
  }

  if (/^SELECT \* FROM order_items WHERE order_id = \$1/i.test(normalizedSql)) {
    const items = fallbackData.order_items.filter((i) => i.order_id === params[0])
    return { rows: items, rowCount: items.length }
  }

  // 4. Stats
  if (/COUNT\(\*\) FROM products/i.test(normalizedSql)) {
    return { rows: [{ count: fallbackData.products.length }] }
  }
  if (/COUNT\(\*\) FROM orders/i.test(normalizedSql)) {
    return { rows: [{ count: fallbackData.orders.length }] }
  }
  if (/SUM\(total\) FROM orders/i.test(normalizedSql)) {
    const totalRev = fallbackData.orders.reduce((sum, o) => sum + (o.total || 0), 0)
    return { rows: [{ sum: totalRev }] }
  }

  return { rows: [], rowCount: 0 }
}

export default { query, initDB }

