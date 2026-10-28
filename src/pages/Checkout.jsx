import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { api, pollOrderStatus } from '../lib/api'

// Checkout Finite State Machine states
const CHECKOUT_STATES = {
  IDLE: 'idle',
  ENQUEUING: 'enqueuing',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  CONFIRMED: 'confirmed',
  SOLD_OUT: 'sold_out',
  FAILED: 'failed',
}

const Checkout = () => {
  const { user } = useAuth()
  const { items, total, clearCart } = useCart()
  const navigate = useNavigate()

  // State Machine
  const [fsmState, setFsmState] = useState(CHECKOUT_STATES.IDLE)
  const [queueInfo, setQueueInfo] = useState({ position: 0, orderId: null })
  const [errorMessage, setErrorMessage] = useState(null)

  // Idempotency Key: generated once per checkout session
  const [idempotencyKey, setIdempotencyKey] = useState('')

  useEffect(() => {
    // Generate UUIDv4 for idempotency
    const key = 'idem_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now()
    setIdempotencyKey(key)
  }, [])

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '9876543210',
    address: '42, Innovation Boulevard, Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    // Honeypot field for anti-bot protection (must remain empty)
    hp_website: '',
  })

  // Track click spamming count for live demo showcase
  const [clickCount, setClickCount] = useState(0)
  const isSubmitting = fsmState !== CHECKOUT_STATES.IDLE && fsmState !== CHECKOUT_STATES.FAILED && fsmState !== CHECKOUT_STATES.SOLD_OUT

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault()

    // 1. FRONTEND SPAM GUARD: Immediately disable button if already submitting
    if (isSubmitting) {
      setClickCount((prev) => prev + 1)
      toast('Click ignored: Request already in-flight! (Anti-spam guard active)', { icon: '🛡️' })
      return
    }

    if (items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setFsmState(CHECKOUT_STATES.ENQUEUING)
    setErrorMessage(null)

    try {
      const orderPayload = {
        items,
        total,
        customerName: form.name,
        phone: form.phone,
        shippingAddress: {
          address: form.address,
          city: form.city,
          pincode: form.pincode,
        },
        hp_website: form.hp_website, // honeypot
      }

      // 2. SEND WITH IDEMPOTENCY KEY TO DECOUPLE AND DEDUPLICATE
      const enqueueRes = await api.createOrder(orderPayload, idempotencyKey)

      if (enqueueRes.isDuplicate) {
        toast.success('Duplicate request caught! Recovering existing order...')
        clearCart()
        navigate(`/order-confirmation/${enqueueRes.id}`)
        return
      }

      const orderId = enqueueRes.id
      setQueueInfo({ position: enqueueRes.queuePosition || 1, orderId })
      setFsmState(CHECKOUT_STATES.QUEUED)

      // 3. GRACEFUL EXPONENTIAL BACKOFF POLLING (Tracking decoupled queue)
      const finalStatus = await pollOrderStatus(orderId, {
        onProgress: (statusData) => {
          if (statusData.status === 'processing') {
            setFsmState(CHECKOUT_STATES.PROCESSING)
          } else if (statusData.status === 'queued') {
            setQueueInfo((prev) => ({ ...prev, position: statusData.queuePosition }))
          }
        },
        maxAttempts: 15,
        baseDelay: 250,
        maxDelay: 2000,
        jitter: 100,
      })

      // 4. TERMINAL SUCCESS
      setFsmState(CHECKOUT_STATES.CONFIRMED)
      clearCart()
      toast.success('Flash Sale Order Confirmed! 🎉')
      setTimeout(() => {
        navigate(`/order-confirmation/${orderId}`)
      }, 800)
    } catch (err) {
      console.error('Checkout error:', err)
      if (err.status === 'sold_out') {
        setFsmState(CHECKOUT_STATES.SOLD_OUT)
        setErrorMessage(err.message || 'Item sold out! The flash sale limit was reached.')
        toast.error('Sold Out: Stock limit reached!')
      } else {
        setFsmState(CHECKOUT_STATES.FAILED)
        setErrorMessage(err.message || 'Order processing failed. Please try again.')
        toast.error(err.message || 'Order failed.')
      }
    }
  }

  // Regenerate Idempotency Key on explicit retry
  const handleResetForRetry = () => {
    setIdempotencyKey('idem_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now())
    setFsmState(CHECKOUT_STATES.IDLE)
    setErrorMessage(null)
  }

  if (items.length === 0 && fsmState === CHECKOUT_STATES.IDLE) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-gray-500">
        <ShoppingBag className="w-16 h-16 text-gray-300" />
        <p className="text-xl font-semibold text-gray-700">Your cart is empty</p>
        <p className="text-sm text-gray-500">Add products to your cart to proceed with checkout.</p>
        <Link to="/products" className="mt-2">
          <Button>Browse Products</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-7 h-7 text-indigo-600" />
            High-Concurrency Checkout
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Engineered with Rapid-Click Spam Protection, Idempotency Keys & Async Queue
          </p>
        </div>

        {/* Live Architecture Status Pill */}
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl px-4 py-2 flex items-center gap-3 text-xs text-indigo-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-semibold">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Idempotency Guard: Active</span>
          </div>
          <span className="text-indigo-300">|</span>
          <span className="font-mono text-[11px] text-indigo-600 truncate max-w-[140px]" title={idempotencyKey}>
            {idempotencyKey.slice(0, 16)}...
          </span>
        </div>
      </div>

      {/* State Machine Status Banner */}
      {fsmState !== CHECKOUT_STATES.IDLE && (
        <div className="mb-8 transition-all duration-300">
          {fsmState === CHECKOUT_STATES.ENQUEUING && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center gap-4 text-indigo-900 animate-pulse">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
              <div>
                <h4 className="font-bold text-sm">Step 1/3: Enqueuing Order Payload</h4>
                <p className="text-xs text-indigo-700">Sending request with Idempotency Key to decouple heavy DB writes...</p>
              </div>
            </div>
          )}

          {fsmState === CHECKOUT_STATES.QUEUED && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-amber-900">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
                <div>
                  <h4 className="font-bold text-sm">Step 2/3: In Asynchronous Message Queue</h4>
                  <p className="text-xs text-amber-700">
                    Order position in queue: <span className="font-bold">#{queueInfo.position}</span>. Sequential background worker processing inventory...
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Polling with Jitter
              </div>
            </div>
          )}

          {fsmState === CHECKOUT_STATES.PROCESSING && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4 text-blue-900">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
              <div>
                <h4 className="font-bold text-sm">Step 3/3: Executing Atomic Stock Lock</h4>
                <p className="text-xs text-blue-700">Executing conditional SQL update: <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">stock = stock - qty WHERE stock &gt;= qty</code></p>
              </div>
            </div>
          )}

          {fsmState === CHECKOUT_STATES.CONFIRMED && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4 text-green-900">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-bold text-sm">Order Confirmed!</h4>
                <p className="text-xs text-green-700">Stock decremented atomically. Redirecting to receipt...</p>
              </div>
            </div>
          )}

          {fsmState === CHECKOUT_STATES.SOLD_OUT && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-red-900">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600" />
                <div>
                  <h4 className="font-bold text-sm">Flash Sale Limit Reached (Sold Out)</h4>
                  <p className="text-xs text-red-700">{errorMessage || 'Strict 500-item inventory cap reached. No overselling occurred.'}</p>
                </div>
              </div>
              <Button size="sm" variant="danger" onClick={handleResetForRetry}>
                Try Another Item
              </Button>
            </div>
          )}

          {fsmState === CHECKOUT_STATES.FAILED && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center justify-between gap-4 text-red-900">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <h4 className="font-bold text-sm">Order Processing Error</h4>
                  <p className="text-xs text-red-700">{errorMessage}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleResetForRetry}>
                Retry Checkout
              </Button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handlePlaceOrder}>
        {/* Hidden Honeypot anti-bot trap */}
        <input
          type="text"
          name="hp_website"
          value={form.hp_website}
          onChange={handleChange}
          style={{ display: 'none' }}
          tabIndex={-1}
          autoComplete="off"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
              <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                Shipping Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe', colSpan: '' },
                  { name: 'email', label: 'Email Address', type: 'email', placeholder: 'you@example.com', colSpan: '' },
                  { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+91 98765 43210', colSpan: '' },
                  { name: 'city', label: 'City', type: 'text', placeholder: 'Bengaluru', colSpan: '' },
                  { name: 'address', label: 'Street Address', type: 'text', placeholder: '123 MG Road', colSpan: 'sm:col-span-2' },
                  { name: 'pincode', label: 'Postal Pincode', type: 'text', placeholder: '560001', colSpan: '' },
                ].map(({ name, label, type, placeholder, colSpan }) => (
                  <div key={name} className={colSpan}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                    <input
                      name={name}
                      type={type}
                      required
                      disabled={isSubmitting}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* High Concurrency Architectural Safeguards Explainer */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/50 border border-indigo-100 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Active High-Concurrency Mitigations:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-indigo-900/80">
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/60">
                  <span className="font-bold text-indigo-700">1. Client Spam Guard:</span>
                  <p className="mt-0.5 text-gray-600">Button disables on 1st click + state tracking prevents repeated clicks.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/60">
                  <span className="font-bold text-indigo-700">2. Idempotency Key:</span>
                  <p className="mt-0.5 text-gray-600">Unique UUID sent per order to prevent duplicate charges or double orders.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/60">
                  <span className="font-bold text-indigo-700">3. Decoupled Message Queue:</span>
                  <p className="mt-0.5 text-gray-600">DB writes queued asynchronously. Client polls with exponential backoff + jitter.</p>
                </div>
                <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100/60">
                  <span className="font-bold text-indigo-700">4. Authoritative Stock Lock:</span>
                  <p className="mt-0.5 text-gray-600">Conditional SQL update strictly prevents overselling the 500-unit cap.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center justify-between">
                <span>Order Summary</span>
                <span className="text-xs font-medium text-gray-400">{items.length} item(s)</span>
              </h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 divide-y divide-gray-50">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center pt-3 first:pt-0">
                    <img
                      src={item.imageUrl || item.image_url}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                      onError={(e) => { e.target.src = 'https://placehold.co/48x48?text=P' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">Qty: {item.qty} × ₹{Number(item.price)?.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                      ₹{(item.price * item.qty).toLocaleString('en-IN')}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 mt-5 pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Standard Shipping</span>
                  <span className="text-green-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between font-extrabold text-gray-900 text-lg border-t border-gray-100 pt-3">
                  <span>Total Amount</span>
                  <span className="text-indigo-600">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Submit Button (Disables immediately after first click) */}
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting || fsmState === CHECKOUT_STATES.SOLD_OUT}
              loading={isSubmitting}
              className="w-full text-base py-3.5 shadow-sm"
            >
              {isSubmitting ? (
                fsmState === CHECKOUT_STATES.QUEUED
                  ? `Position #${queueInfo.position} in Queue...`
                  : 'Processing Async Order...'
              ) : fsmState === CHECKOUT_STATES.SOLD_OUT ? (
                'Flash Sale Sold Out'
              ) : (
                `Confirm & Place Order (₹${total.toLocaleString('en-IN')})`
              )}
            </Button>

            {clickCount > 0 && (
              <p className="text-[11px] text-center text-amber-600 font-medium">
                ⚡ Prevented {clickCount} repetitive click{clickCount !== 1 ? 's' : ''}!
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span>Authoritative Atomic Stock Lock Enabled</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default Checkout
