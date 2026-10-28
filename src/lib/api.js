/**
 * Unified API Client for ShopEase REST backend
 * Enhanced with Idempotency Keys, Rate Limit handling, and Exponential Backoff polling
 */
const API_BASE = '/api'

export const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('shopease_token')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`)
    error.status = response.status
    error.code = data.error
    error.retryAfter = response.headers.get('Retry-After')
    throw error
  }

  return data
}

/**
 * Exponential Backoff with Jitter Polling Helper
 * Gracefully monitors async queue status without hammering the server
 */
export const pollOrderStatus = async (
  orderId,
  {
    onProgress = () => {},
    maxAttempts = 15,
    baseDelay = 300,
    maxDelay = 2500,
    jitter = 150,
  } = {}
) => {
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++

    try {
      const statusRes = await api.getOrderStatus(orderId)
      onProgress(statusRes)

      // Terminal state check
      if (statusRes.status === 'confirmed') {
        return statusRes
      }

      if (statusRes.status === 'sold_out') {
        const err = new Error(statusRes.error || 'Flash sale item is sold out!')
        err.status = 'sold_out'
        throw err
      }

      if (statusRes.status === 'failed') {
        const err = new Error(statusRes.error || 'Order processing failed.')
        err.status = 'failed'
        throw err
      }
    } catch (err) {
      if (err.status === 'sold_out' || err.status === 'failed') throw err
      // Otherwise network hiccup, continue backoff loop
    }

    // Compute exponential backoff with randomized jitter
    const exponentialWait = Math.min(maxDelay, baseDelay * Math.pow(1.4, attempt))
    const randomizedJitter = Math.random() * jitter
    const delay = Math.round(exponentialWait + randomizedJitter)

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  throw new Error('Order verification timed out. Please check My Orders for the status.')
}

export const api = {
  // Auth
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  getMe: () => apiRequest('/auth/me'),

  // Products
  getProducts: (params = {}) => {
    const query = new URLSearchParams()
    if (params.category && params.category !== 'All') query.append('category', params.category)
    if (params.search) query.append('search', params.search)
    const qs = query.toString() ? `?${query.toString()}` : ''
    return apiRequest(`/products${qs}`)
  },

  getProduct: (id) => apiRequest(`/products/${id}`),

  getFlashSaleProduct: () => apiRequest('/products/flash-sale'),

  getCacheStats: () => apiRequest('/products/cache/stats'),

  createProduct: (data) =>
    apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id, data) =>
    apiRequest(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id) =>
    apiRequest(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Orders with Idempotency Key
  createOrder: (orderData, idempotencyKey = null) => {
    const headers = {}
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }

    return apiRequest('/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    })
  },

  getOrderStatus: (id) => apiRequest(`/orders/${id}/status`),

  getQueueStats: () => apiRequest('/orders/queue/stats'),

  getMyOrders: () => apiRequest('/orders/my-orders'),

  getOrder: (id) => apiRequest(`/orders/${id}`),

  getAllOrders: () => apiRequest('/orders'),

  getStats: () => apiRequest('/orders/admin/stats'),
}

export default api
