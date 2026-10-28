import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ProductGrid from '../components/product/ProductGrid'
import Button from '../components/ui/Button'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books']

const Home = () => {
  const { addItem } = useCart()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [flashProduct, setFlashProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')

  // Live Flash Sale Countdown Timer (simulated 2 hours remaining)
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 42, seconds: 18 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 }
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 }
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 }
        return prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [allProd, flash] = await Promise.all([
          api.getProducts({
            category: activeCategory !== 'All' ? activeCategory : undefined,
          }),
          api.getFlashSaleProduct(),
        ])
        setProducts(allProd)
        setFlashProduct(flash)
      } catch (err) {
        console.error('Error fetching home data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeCategory])

  const handleInstantFlashBuy = () => {
    if (!flashProduct) return
    addItem({
      ...flashProduct,
      imageUrl: flashProduct.image_url || flashProduct.imageUrl,
    })
    navigate('/checkout')
  }

  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 text-xs font-semibold text-yellow-300 border border-white/15">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
              Flash Sale Live · Strictly 500 Units Capped
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight tracking-tight">
              Next-Gen E-Commerce.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-orange-400">
                Built for High Concurrency.
              </span>
            </h1>

            <p className="text-indigo-200 text-base md:text-lg max-w-lg leading-relaxed">
              Engineered with client-side spam guards, idempotency keys, decoupled message queues, and authoritative atomic stock locks.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-md text-sm"
              >
                Browse Catalog <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={handleInstantFlashBuy}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all shadow-md text-sm"
              >
                <Zap className="w-4 h-4 fill-current" />
                Claim Flash Sale Unit
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2 text-xs text-indigo-300/80">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Overselling</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Anti-Spam Idempotency</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>&lt;1.5s Fast Interactivity</span>
              </div>
            </div>
          </div>

          {/* Flash Sale Featured Product Card */}
          {flashProduct && (
            <div className="w-full md:w-96 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl relative text-white">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Limited 500 Drop
              </div>

              <div className="aspect-4/3 rounded-2xl overflow-hidden mb-4 bg-gray-900/40 relative">
                <img
                  src={flashProduct.image_url || flashProduct.imageUrl}
                  alt={flashProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-base line-clamp-1">{flashProduct.name}</h3>

                {/* Stock Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-amber-300">Available Stock:</span>
                    <span className="font-mono text-white">
                      {flashProduct.stock} / 500 units
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (flashProduct.stock / 500) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Live Countdown */}
                <div className="flex items-center justify-between bg-black/30 rounded-xl px-3 py-2 text-xs">
                  <span className="text-indigo-200">Event Ends In:</span>
                  <span className="font-mono font-bold text-yellow-300">
                    {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-indigo-200 block">Flash Price</span>
                    <span className="text-2xl font-black text-white">
                      ₹{Number(flashProduct.price)?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Button
                    onClick={handleInstantFlashBuy}
                    disabled={flashProduct.stock === 0}
                    className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-md"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {flashProduct.stock === 0 ? 'Sold Out' : 'Grab Now'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Product Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Featured Catalog</h2>
            <p className="text-gray-500 text-sm mt-0.5">Cached in-memory with authoritative relational persistence</p>
          </div>
          <Link to="/products" className="text-indigo-600 text-sm font-medium hover:underline inline-flex items-center gap-1">
            View all products <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <ProductGrid products={products} loading={loading} />
      </section>

      {/* Architectural Safeguards Feature Cards */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-2xl font-bold text-gray-900">Flash Sale & High Concurrency Architecture</h3>
            <p className="text-gray-500 text-sm mt-2">
              Four defensive layers working together to prevent crashes, bot floods, click spam, and overselling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: '🛡️',
                layer: 'Frontend Layer',
                title: 'Client Spam Guard & FSM',
                desc: 'Disables buttons on 1st click, dispatches unique Idempotency Keys, and polls with exponential backoff + jitter.',
              },
              {
                icon: '⚡',
                layer: 'Gateway & Routing',
                title: 'Rate Limiting & Anti-Bot',
                desc: 'Sliding-window token bucket blocks flood traffic, and hidden honeypot traps deflect automated scrapers.',
              },
              {
                icon: '📬',
                layer: 'Application Logic',
                title: 'Decoupled Queue & Cache',
                desc: 'HTTP requests accept into an async worker queue in 15ms. In-memory caching bypasses heavy DB reads.',
              },
              {
                icon: '🔒',
                layer: 'Database & Storage',
                title: 'Authoritative Atomic Lock',
                desc: 'Conditional SQL decrements strictly enforce the 500-unit cap. Rollbacks prevent partial orders on failure.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col gap-3">
                <span className="text-3xl">{f.icon}</span>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">{f.layer}</span>
                <h4 className="font-bold text-gray-900 text-base">{f.title}</h4>
                <p className="text-gray-600 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
