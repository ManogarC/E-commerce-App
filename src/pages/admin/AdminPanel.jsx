import {
  DollarSign,
  LayoutDashboard,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import { Badge, Spinner } from '../../components/ui/Skeleton'
import { api } from '../../lib/api'

const CATEGORIES = ['Electronics', 'Fashion', 'Home & Living', 'Sports', 'Books']

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: 'Electronics',
  imageUrl: '',
  stock: '15',
  rating: '4.8',
  reviewCount: '0',
}

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [prodData, orderData, statsData] = await Promise.all([
        api.getProducts(),
        api.getAllOrders(),
        api.getStats(),
      ])
      setProducts(prodData)
      setOrders(orderData)
      setStats(statsData)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category: form.category,
        imageUrl: form.imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
        stock: parseInt(form.stock || 10, 10),
        rating: parseFloat(form.rating || 4.5),
        reviewCount: parseInt(form.reviewCount || 0, 10),
      }

      if (editingId) {
        await api.updateProduct(editingId, payload)
        toast.success('Product updated in PostgreSQL!')
      } else {
        await api.createProduct(payload)
        toast.success('New product created in PostgreSQL!')
      }

      setForm(emptyForm)
      setEditingId(null)
      setShowForm(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl || product.image_url || '',
      stock: product.stock,
      rating: product.rating || 4.5,
      reviewCount: product.reviewCount || product.review_count || 0,
    })
    setEditingId(product.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return
    try {
      await api.deleteProduct(id)
      toast.success('Product removed from database.')
      setProducts(products.filter((p) => p.id !== id))
      setStats((prev) => ({ ...prev, totalProducts: Math.max(0, prev.totalProducts - 1) }))
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-indigo-600" /> Admin Control Panel
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage products and orders stored in PostgreSQL</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
            title="Refresh database records"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {activeTab === 'products' && (
            <Button
              onClick={() => {
                setShowForm(!showForm)
                setEditingId(null)
                setForm(emptyForm)
              }}
              className="gap-1.5"
            >
              {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add New Product</>}
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Products</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.totalProducts}</p>
          <span className="text-xs text-gray-400 mt-1 block">Live in PostgreSQL</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Orders</span>
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-gray-900">{stats.totalOrders}</p>
          <span className="text-xs text-gray-400 mt-1 block">Placed by customers</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-3xl font-black text-indigo-600">
            ₹{Number(stats.totalRevenue).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-gray-400 mt-1 block">Recorded sales volume</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Queue & Anti-Spam</span>
            <RefreshCw className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-amber-600">
            {stats.queueStats?.duplicatesBlocked || 0}
            <span className="text-xs text-gray-400 font-normal ml-1">blocked</span>
          </p>
          <span className="text-xs text-amber-600 font-medium mt-1 block">
            {stats.queueStats?.currentQueueLength || 0} in active queue
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        {[
          { id: 'products', icon: Package, label: `Products (${products.length})` },
          { id: 'orders', icon: ShoppingBag, label: `Orders (${orders.length})` },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 pb-3.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : (
        <>
          {/* Add / Edit Form */}
          {activeTab === 'products' && showForm && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-6 mb-8 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-5 text-lg">
                {editingId ? 'Edit Product' : 'Add New Product to PostgreSQL'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Title</label>
                  <input
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Sony WH-1000XM5 Headphones"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹ INR)</label>
                  <input
                    name="price"
                    type="number"
                    required
                    value={form.price}
                    onChange={handleChange}
                    placeholder="2499"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Quantity</label>
                  <input
                    name="stock"
                    type="number"
                    required
                    value={form.stock}
                    onChange={handleChange}
                    placeholder="20"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rating (1 to 5)</label>
                  <input
                    name="rating"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={form.rating}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Image URL</label>
                  <input
                    name="imageUrl"
                    type="url"
                    value={form.imageUrl}
                    onChange={handleChange}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    name="description"
                    required
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide details about the product..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowForm(false)
                      setEditingId(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving}>
                    {editingId ? 'Update Product' : 'Save to PostgreSQL'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Products Table */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Product</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Category</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Price</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Stock</th>
                      <th className="text-right px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((p) => {
                      const img = p.imageUrl || p.image_url
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={img}
                                alt={p.name}
                                className="w-11 h-11 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                                onError={(e) => { e.target.src = 'https://placehold.co/44x44?text=P' }}
                              />
                              <div className="min-w-0">
                                <span className="font-semibold text-gray-900 truncate block max-w-sm">{p.name}</span>
                                <span className="text-xs text-gray-400">ID: #{p.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-bold text-gray-900">
                            ₹{Number(p.price)?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4">
                            <Badge color={p.stock > 10 ? 'green' : p.stock > 0 ? 'yellow' : 'red'}>
                              {p.stock > 0 ? `${p.stock} units` : 'Out of stock'}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleEdit(p)}
                                className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                                title="Edit product"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                title="Delete product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders Table */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Order ID</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Customer</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Items</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Total</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-left px-5 py-3.5 font-bold text-gray-600 text-xs uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-xs text-indigo-600">
                          {o.id}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">{o.customer_name || 'Customer'}</p>
                          <p className="text-xs text-gray-400">{o.user_email}</p>
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {o.items?.length || 0} item(s)
                        </td>
                        <td className="px-5 py-4 font-black text-gray-900">
                          ₹{Number(o.total)?.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-4">
                          <Badge color="green">
                            {o.status?.toUpperCase() || 'CONFIRMED'}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">
                          {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          }) : 'Today'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="text-center py-16 text-gray-400">
                    No orders recorded yet. Orders will appear here in real-time as users check out.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminPanel
