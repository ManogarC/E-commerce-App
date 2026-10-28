import {
  Cpu,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  User,
  X,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import CartDrawer from '../cart/CartDrawer'
import ConcurrencySimulator from '../ui/ConcurrencySimulator'

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const [cartOpen, setCartOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [simulatorOpen, setSimulatorOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
                <Package className="w-6 h-6" />
                ShopEase
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-6">
                <Link to="/" className="text-gray-600 hover:text-indigo-600 text-sm font-medium transition-colors">
                  Home
                </Link>
                <Link to="/products" className="text-gray-600 hover:text-indigo-600 text-sm font-medium transition-colors">
                  Products
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5">
                    <LayoutDashboard className="w-4 h-4" /> Admin Panel
                  </Link>
                )}
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Concurrency Simulator Trigger Button */}
              <button
                onClick={() => setSimulatorOpen(true)}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-all duration-150 animate-pulse hover:animate-none"
                title="Open High-Concurrency & Stress Test Console"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Flash Sale Console</span>
                <span className="sm:hidden">Console</span>
              </button>

              {/* Cart Button */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* User Menu */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors border border-gray-200"
                    aria-label="User menu"
                  >
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                      {(user.name || user.email || 'U')[0]}
                    </div>
                    <span className="text-xs font-semibold text-gray-700 max-w-[100px] truncate">
                      {user.name || user.email}
                    </span>
                    {user.role === 'admin' && (
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800 truncate">{user.name || 'User'}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <Link
                        to="/orders"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Package className="w-4 h-4" /> My Orders
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <User className="w-4 h-4" /> Sign In
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button
                className="md:hidden p-2 text-gray-600"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
            <Link to="/" className="block py-2 text-sm text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Home</Link>
            <Link to="/products" className="block py-2 text-sm text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Products</Link>
            {isAdmin && (
              <Link to="/admin" className="block py-2 text-sm text-indigo-600 font-semibold" onClick={() => setMobileMenuOpen(false)}>Admin Panel</Link>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setSimulatorOpen(true)
              }}
              className="w-full text-left py-2 text-sm text-amber-600 font-bold flex items-center gap-2"
            >
              <Zap className="w-4 h-4" /> Flash Sale & Concurrency Console
            </button>
            {user ? (
              <>
                <Link to="/orders" className="block py-2 text-sm text-gray-700 font-medium" onClick={() => setMobileMenuOpen(false)}>My Orders</Link>
                <button onClick={handleLogout} className="block py-2 text-sm text-red-600 font-medium w-full text-left">Sign Out</button>
              </>
            ) : (
              <Link to="/login" className="block py-2 text-sm text-indigo-600 font-medium" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
            )}
          </div>
        )}
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <ConcurrencySimulator isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />
    </>
  )
}

export default Navbar
