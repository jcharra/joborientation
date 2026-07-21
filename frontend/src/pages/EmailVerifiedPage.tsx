import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMe } from '../api/auth'
import type { User } from '../api/auth'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './LoginPage.module.css'

export default function EmailVerifiedPage() {
  const { t } = useTranslation()
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const role = searchParams.get('role') as User['role'] | null
    const errorParam = searchParams.get('error')

    if (errorParam || !token || !role) {
      setError(t('verify.error'))
      return
    }

    localStorage.setItem('token', token)
    localStorage.setItem('role', role)

    const meRole = role === 'student' ? 'student' : 'consultant'
    getMe(meRole)
      .then(user => {
        setAuth(token, user)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        localStorage.clear()
        setError(t('verify.error'))
      })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.topBar}>
          <LanguageSwitcher />
        </div>
        {error
          ? (
            <>
              <p style={{ textAlign: 'center', color: 'var(--color-error, #b91c1c)', marginBottom: '1.5rem' }}>{error}</p>
              <p className={styles.cardFooter}>
                <Link to="/login">{t('register.signIn')}</Link>
              </p>
            </>
          )
          : <p style={{ textAlign: 'center', color: 'var(--color-text-secondary, #555)' }}>{t('verify.verifying')}</p>
        }
      </div>
    </div>
  )
}
