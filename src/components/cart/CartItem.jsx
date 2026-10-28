import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const CartItem = ({ item }) => {
  const { removeItem, updateQty } = useCart()

  return (
    <div className="flex gap-3 py-4 border-b border-gray-100 last:border-0">
      <img
        src={item.imageUrl}
        alt={item.name}
        className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-gray-100"
        onError={(e) => { e.target.src = 'https://placehold.co/64x64?text=Img' }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
        <p className="text-sm text-indigo-600 font-semibold mt-0.5">₹{item.price.toLocaleString('en-IN')}</p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQty(item.id, item.qty - 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
          <button
            onClick={() => updateQty(item.id, item.qty + 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="Increase quantity"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button
          onClick={() => removeItem(item.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          aria-label="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-gray-900">
          ₹{(item.price * item.qty).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  )
}

export default CartItem

