import bcrypt from 'bcryptjs'
import { query } from './db.js'

export const seedDatabase = async () => {
  try {
    // 1. Check if users already seeded
    const existingAdmin = await query('SELECT * FROM users WHERE email = $1', ['admin@shopease.com'])
    if (existingAdmin.rows.length === 0) {
      console.log('🌱 Seeding demo users...')
      const adminPass = await bcrypt.hash('admin123', 10)
      const userPass = await bcrypt.hash('user123', 10)

      await query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Admin User', 'admin@shopease.com', adminPass, 'admin']
      )

      await query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['John Doe', 'user@shopease.com', userPass, 'user']
      )
      console.log('✅ Demo users seeded (admin@shopease.com / admin123, user@shopease.com / user123)')
    }

    // 2. Check if products already seeded
    const productsRes = await query('SELECT * FROM products ORDER BY created_at DESC')
    if (productsRes.rows.length === 0) {
      console.log('🌱 Seeding catalog products...')
      const initialProducts = [
        {
          name: '⚡ CyberPulse Neo Pro - Flash Sale Special Edition (Strictly 500 Units)',
          description: 'Exclusive Flash Sale Drop: Next-gen wearable cyber-deck with neural haptics, quantum OLED display, and titanium casing. Limited to strictly 500 units worldwide!',
          price: 1999,
          category: 'Electronics',
          image_url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
          stock: 500,
          rating: 5.0,
          review_count: 500,
        },
        {
          name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
          description: 'Industry-leading noise cancellation with 2 processors, 8 microphones, and up to 30-hour battery life. Ultra-comfortable lightweight design.',
          price: 29990,
          category: 'Electronics',
          image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
          stock: 15,
          rating: 4.8,
          review_count: 142,
        },
        {
          name: 'Apple Watch Series 9 GPS 45mm',
          description: 'Advanced health sensors, bright Always-On Retina display, S9 SiP chip, and Double Tap gesture control. Water resistant to 50 meters.',
          price: 44900,
          category: 'Electronics',
          image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
          stock: 12,
          rating: 4.9,
          review_count: 98,
        },
        {
          name: 'Classic Vintage Leather Backpack',
          description: 'Handcrafted from full-grain genuine leather. Padded laptop compartment fits up to 15.6 inch laptops. Perfect for work, travel, and everyday carry.',
          price: 4999,
          category: 'Fashion',
          image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
          stock: 25,
          rating: 4.7,
          review_count: 64,
        },
        {
          name: 'Nike Air Max 270 React Sneakers',
          description: 'Contemporary athletic shoe combining Nike largest Max Air unit with resilient Nike React foam for all-day comfort and bold streetwear style.',
          price: 11495,
          category: 'Fashion',
          image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
          stock: 18,
          rating: 4.6,
          review_count: 112,
        },
        {
          name: 'Minimalist Ceramic Pour-Over Coffee Maker Set',
          description: 'Artisan handcrafted ceramic dripper with wooden collar and heat-resistant glass carafe. Brew barista-grade pour-over coffee right at home.',
          price: 2499,
          category: 'Home & Living',
          image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
          stock: 30,
          rating: 4.8,
          review_count: 53,
        },
        {
          name: 'Ergonomic Memory Foam Lumbar Cushion',
          description: 'High-density therapeutic memory foam designed to relieve lower back pain and correct posture during long work hours or drives.',
          price: 1899,
          category: 'Home & Living',
          image_url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80',
          stock: 40,
          rating: 4.5,
          review_count: 77,
        },
        {
          name: 'Pro Series Anti-Burst Yoga & Exercise Ball (65cm)',
          description: 'Extra thick, non-slip textured PVC surface with quick-inflation foot pump included. Ideal for Pilates, core training, and desk seating.',
          price: 1299,
          category: 'Sports',
          image_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
          stock: 22,
          rating: 4.6,
          review_count: 39,
        },
        {
          name: 'Atomic Habits by James Clear (Hardcover Edition)',
          description: 'An easy & proven way to build good habits and break bad ones. Over 15 million copies sold worldwide. Transform your daily routines.',
          price: 799,
          category: 'Books',
          image_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
          stock: 50,
          rating: 5.0,
          review_count: 320,
        },
      ]

      for (const p of initialProducts) {
        await query(
          'INSERT INTO products (name, description, price, category, image_url, stock, rating, review_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [p.name, p.description, p.price, p.category, p.image_url, p.stock, p.rating, p.review_count]
        )
      }
      console.log('✅ 8 catalog products seeded successfully!')
    } else {
      // Ensure the 500-unit flash sale product is present
      const hasFlashSale = productsRes.rows.some((p) => p.name?.includes('500 Units'))
      if (!hasFlashSale) {
        await query(
          'INSERT INTO products (name, description, price, category, image_url, stock, rating, review_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [
            '⚡ CyberPulse Neo Pro - Flash Sale Special Edition (Strictly 500 Units)',
            'Exclusive Flash Sale Drop: Next-gen wearable cyber-deck with neural haptics, quantum OLED display, and titanium casing. Limited to strictly 500 units worldwide!',
            1999,
            'Electronics',
            'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80',
            500,
            5.0,
            500,
          ]
        )
        console.log('✅ 500-unit Flash Sale product added!')
      }
    }
  } catch (err) {
    console.error('Error during database seed:', err)
  }
}

