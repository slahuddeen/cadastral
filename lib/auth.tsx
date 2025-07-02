// lib/auth.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check if user is already logged in on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('cadastral_auth')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const login = (username: string, password: string): boolean => {
    // Get credentials from environment variables
    const validUsername = process.env.NEXT_PUBLIC_AUTH_USERNAME || 'admin'
    const validPassword = process.env.NEXT_PUBLIC_AUTH_PASSWORD || 'password'

    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true)
      localStorage.setItem('cadastral_auth', 'authenticated')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('cadastral_auth')
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
