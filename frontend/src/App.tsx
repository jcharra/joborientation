import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConsultantProfilePage from './pages/ConsultantProfilePage'
import ConsultantSessionPage from './pages/ConsultantSessionPage'
import StudentsListPage from './pages/admin/StudentsListPage'
import ConsultantsListPage from './pages/admin/ConsultantsListPage'
import TopicsListPage from './pages/admin/TopicsListPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ConsultantProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/session"
            element={
              <RequireAuth>
                <ConsultantSessionPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/students"
            element={
              <RequireAdmin>
                <StudentsListPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/consultants"
            element={
              <RequireAdmin>
                <ConsultantsListPage />
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/topics"
            element={
              <RequireAdmin>
                <TopicsListPage />
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
