/**
 * In-Memory Product & Inventory Cache Layer
 * Simulates high-performance caching (like Redis) to bypass primary DB hits on reads
 */
class ProductCache {
  constructor(defaultTTL = 30000) {
    this.cache = new Map()
    this.defaultTTL = defaultTTL
    this.hits = 0
    this.misses = 0
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) {
      this.misses++
      return null
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      this.misses++
      return null
    }

    this.hits++
    return item.data
  }

  set(key, data, ttl = this.defaultTTL) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }

  del(key) {
    this.cache.delete(key)
  }

  flush() {
    this.cache.clear()
  }

  getStats() {
    const total = this.hits + this.misses
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%'
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate,
      keysCount: this.cache.size,
    }
  }
}

export const productCache = new ProductCache(15000) // 15 seconds TTL
export default productCache

