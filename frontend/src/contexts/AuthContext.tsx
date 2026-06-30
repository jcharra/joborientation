import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getMe, logout as apiLogout } from '../api/auth'
import type { User } from '../api/auth'

interface AuthContextValue {
  user: User | null
  token: string | null
  setAuth: (token: string, user: User) => void
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    const role = localStorage.getItem('role') as User['role'] | null
    if (!role) { setLoading(false); return }
    getMe(role === 'student' ? 'student' : 'consultant')
      .then(setUser)
      .catch(() => { localStorage.clear(); setToken(null) })
      .finally(() => setLoading(false))
  }, [token])

  function setAuth(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('role', newUser.role)
    setToken(newToken)
    setUser(newUser)
  }

  async function logout() {
    const role = user?.role
    try { if (role) await apiLogout(role === 'student' ? 'student' : 'consultant') } catch {}
    localStorage.clear()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, setAuth, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
