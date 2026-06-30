import { useState, use } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { loginConsultant, loginStudent } from '../api/auth'
import { fetchConfig } from '../api/config'
import type { AppConfig } from '../api/config'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './LoginPage.module.css'

type Tab = 'student' | 'consultant'

const configPromise = fetchConfig()

function LoginForm({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('student')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const useLdap = tab === 'student' ? config.ldap_students : config.ldap_consultants
  const identifierLabel = useLdap ? t('login.labelUsername') : t('login.labelEmail')
  const identifierType = useLdap ? 'text' : 'email'
  const identifierAutoComplete = useLdap ? 'username' : 'email'

  function handleTabChange(next: Tab) {
    setTab(next)
    setIdentifier('')
    setError(null)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = tab === 'student'
        ? await loginStudent(identifier, password, config.ldap_students)
        : await loginConsultant(identifier, password, config.ldap_consultants)
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
            onClick={() => handleTabChange('student')}
          >
            {t('login.tabStudent')}
          </button>
          <button
            className={tab === 'consultant' ? styles.tabActive : styles.tab}
            onClick={() => handleTabChange('consultant')}
          >
            {t('login.tabConsultant')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>{identifierLabel}</span>
            <input
              type={identifierType}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete={identifierAutoComplete}
              required
            />
          </label>

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

export default function LoginPage() {
  const config = use(configPromise)
  return <LoginForm config={config} />
}
