import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loginConsultant, loginStudent } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './LoginPage.module.css'

type Tab = 'student' | 'consultant'

export default function LoginPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('student')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { setAuth } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = tab === 'student'
        ? await loginStudent(username, password)
        : await loginConsultant(email, password)
      setAuth(result.token, result.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('login.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <LanguageSwitcher />
        </div>

        <h1 className={styles.title}>{t('login.title')}</h1>

        <div className={styles.tabs}>
          <button
            className={tab === 'student' ? styles.tabActive : styles.tab}
            onClick={() => { setTab('student'); setError(null) }}
          >
            {t('login.tabStudent')}
          </button>
          <button
            className={tab === 'consultant' ? styles.tabActive : styles.tab}
            onClick={() => { setTab('consultant'); setError(null) }}
          >
            {t('login.tabConsultant')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {tab === 'student' ? (
            <label className={styles.field}>
              <span>{t('login.labelUsername')}</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span>{t('login.labelEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          )}

          <label className={styles.field}>
            <span>{t('login.labelPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
