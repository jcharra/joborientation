import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { JSX } from 'react/jsx-runtime'

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}
