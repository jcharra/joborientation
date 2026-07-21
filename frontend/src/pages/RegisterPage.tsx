import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { register, resendVerification } from '../api/auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './LoginPage.module.css'

type Role = 'student' | 'consultant'

export default function RegisterPage() {
  const { t } = useTranslation()

  const [role, setRole] = useState<Role>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)
  const [resendDone, setResendDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await register(name, email, password, passwordConfirmation, role)
      setSubmitted(true)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('register.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleResend() {
    setResendBusy(true)
    setResendDone(false)
    try {
      await resendVerification(email)
      setResendDone(true)
    } finally {
      setResendBusy(false)
    }
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.topBar}>
            <LanguageSwitcher />
          </div>
          <h1 className={styles.title}>{t('register.checkEmail')}</h1>
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary, #555)', marginBottom: '1.5rem' }}>
            {t('register.checkEmailDesc', { email })}
          </p>
          {resendDone
            ? <p style={{ textAlign: 'center', color: 'var(--color-success, #2d7d46)' }}>{t('register.resent')}</p>
            : (
              <button
                type="button"
                className={styles.submit}
                onClick={handleResend}
                disabled={resendBusy}
                style={{ marginBottom: '1rem' }}
              >
                {resendBusy ? t('register.resending') : t('register.resendEmail')}
              </button>
            )
          }
          <p className={styles.cardFooter}>
            {t('register.haveAccount')}{' '}
            <Link to="/login">{t('register.signIn')}</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <LanguageSwitcher />
        </div>

        <h1 className={styles.title}>{t('register.title')}</h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={role === 'student' ? styles.tabActive : styles.tab}
            onClick={() => setRole('student')}
          >
            {t('login.tabStudent')}
          </button>
          <button
            type="button"
            className={role === 'consultant' ? styles.tabActive : styles.tab}
            onClick={() => setRole('consultant')}
          >
            {t('login.tabConsultant')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>{t('register.labelName')}</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>

          <label className={styles.field}>
            <span>{t('login.labelEmail')}</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.field}>
            <span>{t('login.labelPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className={styles.field}>
            <span>{t('register.labelPasswordConfirm')}</span>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={e => setPasswordConfirmation(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? t('register.submitting') : t('register.submit')}
          </button>
        </form>

        <p className={styles.cardFooter}>
          {t('register.haveAccount')}{' '}
          <Link to="/login">{t('register.signIn')}</Link>
        </p>
      </div>
    </div>
  )
}
