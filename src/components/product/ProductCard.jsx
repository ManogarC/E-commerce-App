import { ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import Button from '../ui/Button'

const ProductCard = ({ product }) => {
  const { addItem } = useCart()
  const img = product.imageUrl || product.image_url || 'https://placehold.co/400x300?text=Product'
  const reviews = product.reviewCount || product.review_count || 0
  const rating = parseFloat(product.rating || 4.5)

  return (
    <div className="bg-white rounded-2xl shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden group flex flex-col border border-gray-100">
      <Link to={`/products/${product.id}`} className="overflow-hidden bg-gray-50 aspect-4/3 relative">
        <img
          src={img}
          alt={product.name}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Product' }}
          loading="lazy"
        />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-bold text-indigo-600 uppercase tracking-wider shadow-2xs">
          {product.category}
        </div>
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/products/${product.id}`}>
          <h3 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-2">
          <div className="flex items-center">
            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-bold text-gray-700 ml-1">{rating.toFixed(1)}</span>
          </div>
          <span className="text-xs text-gray-400">({reviews})</span>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-gray-50">
          <div>
            <span className="text-xs text-gray-400 block">Price</span>
            <span className="text-base font-bold text-gray-900">
              ₹{Number(product.price)?.toLocaleString('en-IN')}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => addItem({ ...product, imageUrl: img })}
            disabled={product.stock === 0}
            className="gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            {product.stock === 0 ? 'Out of Stock' : 'Add'}
          </Button>
        </div>

        {product.stock > 0 && product.stock <= 5 && (
          <p className="text-[11px] font-medium text-orange-500 mt-1.5">⚡ Only {product.stock} left in stock!</p>
        )}
      </div>
    </div>
  )
}

export default ProductCard
