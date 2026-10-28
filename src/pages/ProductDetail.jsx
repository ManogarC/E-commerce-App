import { ChevronLeft, Minus, Plus, ShoppingCart, Star, ShieldCheck, Truck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Spinner } from '../components/ui/Skeleton'
import { useCart } from '../context/CartContext'
import { api } from '../lib/api'

const ProductDetail = () => {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await api.getProduct(id)
        setProduct(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [id])

  const handleAddToCart = () => {
    for (let i = 0; i < qty; i++) {
      addItem({
        ...product,
        imageUrl: product.imageUrl || product.image_url,
      })
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-24">
        <p className="text-2xl font-bold text-gray-700">Product not found</p>
        <Link to="/products" className="text-indigo-600 mt-4 inline-block hover:underline">
          ← Back to Products
        </Link>
      </div>
    )
  }

  const img = product.imageUrl || product.image_url || 'https://placehold.co/600x600?text=Product'
  const rating = parseFloat(product.rating || 4.5)
  const reviews = product.reviewCount || product.review_count || 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <span>/</span>
        <Link to="/products" className="hover:text-indigo-600">Products</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      <Link to="/products" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-8">
        <ChevronLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image */}
        <div className="rounded-3xl overflow-hidden bg-gray-50 aspect-square border border-gray-100 shadow-sm">
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => { e.target.src = 'https://placehold.co/600x600?text=Product' }}
          />
        </div>

        {/* Details */}
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {product.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3">{product.name}</h1>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
            <span className="text-sm text-gray-400">({reviews} customer reviews)</span>
          </div>

          <p className="text-3xl font-black text-gray-900">
            ₹{Number(product.price)?.toLocaleString('en-IN')}
          </p>

          <p className="text-gray-600 leading-relaxed text-sm md:text-base">{product.description}</p>

          {/* Stock Info */}
          <div>
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                ✓ In Stock ({product.stock} units available)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
                ✗ Currently Out of Stock
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Quantity</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-white">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors"
                  aria-label="Decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-5 py-2 text-sm font-bold border-x border-gray-200">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="px-4 py-2 hover:bg-gray-100 transition-colors"
                  aria-label="Increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="gap-2 flex-1"
            >
              <ShoppingCart className="w-5 h-5" />
              {added ? '✓ Added to Cart!' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 mt-4">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800">Free Express Delivery</p>
                <p className="text-[11px] text-gray-500">Delivered in 2-3 business days</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-800">100% Authentic Guarantee</p>
                <p className="text-[11px] text-gray-500">Directly from verified brands</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
