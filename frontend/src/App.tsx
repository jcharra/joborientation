import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider } from './contexts/AuthContext'
import { EventTitleProvider, useEventTitle } from './contexts/EventTitleContext'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EmailVerifiedPage from './pages/EmailVerifiedPage'
import DashboardPage from './pages/DashboardPage'
import ConsultantProfilePage from './pages/ConsultantProfilePage'
import ConsultantSessionPage from './pages/ConsultantSessionPage'
import StudentsListPage from './pages/admin/StudentsListPage'
import ConsultantsListPage from './pages/admin/ConsultantsListPage'
import ConsultantDetailPage from './pages/admin/ConsultantDetailPage'
import TopicsListPage from './pages/admin/TopicsListPage'
import InviteSpeakerPage from './pages/admin/InviteSpeakerPage'
import BulkInviteSpeakersPage from './pages/admin/BulkInviteSpeakersPage'
import SeriesListPage from './pages/admin/SeriesListPage'
import TagsListPage from './pages/admin/TagsListPage'
import EventTitlePage from './pages/admin/EventTitlePage'
import EventPage from './pages/admin/EventPage'
import UsersPage from './pages/admin/UsersPage'
import SetPasswordPage from './pages/SetPasswordPage'

function DocumentTitle() {
  const { i18n } = useTranslation()
  const { eventTitle } = useEventTitle()

  useEffect(() => {
    if (!eventTitle) return
    const lang = i18n.language.slice(0, 2) as 'en' | 'de' | 'fr'
    document.title = eventTitle[lang] ?? eventTitle.en
  }, [eventTitle, i18n.language])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <EventTitleProvider>
        <AuthProvider>
          <DocumentTitle />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/email/verify/:id/:hash" element={<EmailVerifiedPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
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
              path="/admin/consultants/:id"
              element={
                <RequireAdmin>
                  <ConsultantDetailPage />
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
            <Route
              path="/admin/invite"
              element={
                <RequireAdmin>
                  <InviteSpeakerPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/invite/bulk"
              element={
                <RequireAdmin>
                  <BulkInviteSpeakersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/series"
              element={
                <RequireAdmin>
                  <SeriesListPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/tags"
              element={
                <RequireAdmin>
                  <TagsListPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/event-title"
              element={
                <RequireAdmin>
                  <EventTitlePage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/event"
              element={
                <RequireAdmin>
                  <EventPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <UsersPage />
                </RequireAdmin>
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </EventTitleProvider>
    </BrowserRouter>
  )
}
