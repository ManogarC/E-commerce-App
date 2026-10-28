import { CheckCircle2, Package, ShoppingBag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Spinner } from '../components/ui/Skeleton'
import { api } from '../lib/api'

const OrderConfirmation = () => {
  const { orderId } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await api.getOrder(orderId)
        setOrder(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-10 h-10" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-gray-100 p-8 sm:p-10 shadow-sm">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto mb-8">
          Thank you for your purchase. Your order has been placed and recorded into the PostgreSQL database.
        </p>

        <div className="bg-gray-50 rounded-2xl p-5 text-left mb-6 space-y-3 border border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Order Reference</span>
            <span className="font-mono font-bold text-gray-900 text-xs bg-white px-2.5 py-1 rounded-md border border-gray-200">
              {orderId}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-800">{order?.customer_name || 'Customer'}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Delivery Address</span>
            <span className="font-medium text-gray-800 text-right max-w-xs truncate">
              {order?.shipping_address || 'Standard Delivery'}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm border-t border-gray-200/60 pt-3">
            <span className="text-gray-500">Total Paid</span>
            <span className="font-extrabold text-gray-900 text-lg">
              ₹{Number(order?.total)?.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {order?.status || 'Confirmed'}
            </span>
          </div>
        </div>

        {order?.items && order.items.length > 0 && (
          <div className="text-left mb-8">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-indigo-600" /> Items in this Order ({order.items.length})
            </h3>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-9 h-9 rounded-md object-cover bg-gray-200 flex-shrink-0"
                      />
                    )}
                    <span className="text-gray-700 font-medium truncate max-w-xs">{item.product_name}</span>
                    <span className="text-gray-400 text-xs flex-shrink-0">×{item.qty}</span>
                  </div>
                  <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">
                    ₹{(Number(item.price) * Number(item.qty)).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/orders">
            <Button variant="outline" className="w-full sm:w-auto">
              View All My Orders
            </Button>
          </Link>
          <Link to="/products">
            <Button className="w-full sm:w-auto">
              <ShoppingBag className="w-4 h-4" /> Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmation
