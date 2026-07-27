import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { forgotPassword } from '../api/auth'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './SetPasswordPage.module.css'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()

  const [email, setEmail]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch {
      setError(t('forgotPassword.errorGeneric'))
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
        <h1 className={styles.title}>{t('forgotPassword.title')}</h1>
        <p className={styles.subtitle}>{t('forgotPassword.subtitle')}</p>

        {success ? (
          <p className={styles.subtitle}>{t('forgotPassword.success')}</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
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
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
            </button>
          </form>
        )}

        <Link to="/login" className={styles.backLink}>
          {t('forgotPassword.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
