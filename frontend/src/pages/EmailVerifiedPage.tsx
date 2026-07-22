import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { verifyEmail } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './LoginPage.module.css'

export default function EmailVerifiedPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const { id, hash } = useParams<{ id: string; hash: string }>()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const expires   = searchParams.get('expires') ?? ''
    const signature = searchParams.get('signature') ?? ''

    if (!id || !hash || !expires || !signature) {
      setError(t('verify.error'))
      return
    }

    verifyEmail(id, hash, expires, signature)
      .then(({ token, user }) => {
        setAuth(token, user)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => setError(t('verify.error')))
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <LanguageSwitcher />
        </div>
        {error ? (
          <>
            <p style={{ textAlign: 'center', color: 'var(--color-error, #b91c1c)', marginBottom: '1.5rem' }}>{error}</p>
            <p className={styles.cardFooter}>
              <Link to="/login">{t('register.signIn')}</Link>
            </p>
          </>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary, #555)' }}>{t('verify.verifying')}</p>
        )}
      </div>
    </div>
  )
}
