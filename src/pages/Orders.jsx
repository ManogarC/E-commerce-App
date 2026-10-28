import { Package, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Spinner } from '../components/ui/Skeleton'
import { api } from '../lib/api'

const statusColor = { confirmed: 'green', pending: 'yellow', delivered: 'indigo', failed: 'red' }

const Orders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.getMyOrders()
        setOrders(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-indigo-600" /> My Orders
        </h1>
        <p className="text-gray-500 text-sm mt-0.5">Your recorded purchase history in PostgreSQL</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-xs">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-bold text-gray-800">No orders placed yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            Browse our catalog, add your favorite items to the cart, and experience the instant checkout.
          </p>
          <Link to="/products" className="mt-4 inline-block">
            <button className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
              Explore Catalog
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs hover:border-indigo-100 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-50">
                <div>
                  <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                    {order.id}
                  </span>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }) : 'Just now'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={statusColor[order.status?.toLowerCase()] || 'green'}>
                    {order.status?.toUpperCase()}
                  </Badge>
                  <span className="font-extrabold text-gray-900 text-base">
                    ₹{Number(order.total)?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Order items preview */}
              <div className="flex flex-wrap gap-2 mb-3">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-7 h-7 rounded object-cover bg-gray-200"
                      />
                    )}
                    <span className="text-xs font-medium text-gray-700 truncate max-w-[150px]">
                      {item.product_name}
                    </span>
                    <span className="text-xs text-gray-400">×{item.qty}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-gray-400 truncate max-w-xs">
                  Shipped to: {order.shipping_address}
                </span>
                <Link
                  to={`/order-confirmation/${order.id}`}
                  className="text-indigo-600 font-semibold hover:underline flex-shrink-0"
                >
                  View Order Receipt →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders
