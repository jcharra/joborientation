import { useState, use } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
  // Admins only ever have an email+password account, never an LDAP one — this lets them (or any
  // consultant with a real password) opt out of the LDAP form even while it's enabled by default.
  const [forcePasswordLogin, setForcePasswordLogin] = useState(false)

  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const ldapEnabledForTab = tab === 'student' ? config.ldap_students : config.ldap_consultants
  const useLdap = ldapEnabledForTab && !forcePasswordLogin
  const identifierLabel = useLdap ? t('login.labelUsername') : t('login.labelEmail')
  const identifierType = useLdap ? 'text' : 'email'
  const identifierAutoComplete = useLdap ? 'username' : 'email'

  function handleTabChange(next: Tab) {
    setTab(next)
    setIdentifier('')
    setError(null)
    setForcePasswordLogin(false)
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const result = tab === 'student'
        ? await loginStudent(identifier, password, useLdap)
        : await loginConsultant(identifier, password, useLdap)
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

        {ldapEnabledForTab && (
          <button
            type="button"
            className={styles.switchModeLink}
            onClick={() => { setForcePasswordLogin(v => !v); setIdentifier(''); setError(null) }}
          >
            {forcePasswordLogin ? t('login.useLdapInstead') : t('login.useEmailInstead')}
          </button>
        )}

        {tab === 'student' ? (
          <p className={styles.cardFooter}>
            {t('login.noAccount')}{' '}
            <Link to="/register">{t('login.register')}</Link>
          </p>
        ) : (
          <p className={styles.cardFooter}>
            {t('login.invitationOnly')}{' '}
            <a href={`mailto:${config.admin_email}`}>{t('login.requestInvitation')}</a>
          </p>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const config = use(configPromise)
  return <LoginForm config={config} />
}
