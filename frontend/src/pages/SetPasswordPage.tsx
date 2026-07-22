import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { acceptInvitation } from '../api/invite'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './SetPasswordPage.module.css'

export default function SetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [busy, setBusy]           = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('setPassword.errorMismatch'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await acceptInvitation({
        email,
        token,
        password,
        password_confirmation: confirm,
      })
      setAuth(result.token, result.user)
      navigate('/dashboard')
    } catch {
      setError(t('setPassword.errorGeneric'))
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
        <h1 className={styles.title}>{t('setPassword.title')}</h1>
        <p className={styles.subtitle}>{t('setPassword.subtitle')}</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>{t('setPassword.labelPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className={styles.field}>
            <span>{t('setPassword.labelConfirm')}</span>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submit} disabled={busy}>
            {busy ? t('setPassword.submitting') : t('setPassword.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
