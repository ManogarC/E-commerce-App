import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verify stored token on app mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('shopease_token')
      if (token) {
        try {
          const res = await api.getMe()
          setUser(res.user)
        } catch {
          localStorage.removeItem('shopease_token')
          setUser(null)
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const register = async (name, email, password) => {
    const res = await api.register(name, email, password)
    localStorage.setItem('shopease_token', res.token)
    setUser(res.user)
    return res.user
  }

  const login = async (email, password) => {
    const res = await api.login(email, password)
    localStorage.setItem('shopease_token', res.token)
    setUser(res.user)
    return res.user
  }

  const logout = () => {
    localStorage.removeItem('shopease_token')
    setUser(null)
  }

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        isAdmin,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}
