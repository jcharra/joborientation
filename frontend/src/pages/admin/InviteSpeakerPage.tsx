import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { inviteSpeaker } from '../../api/invite'
import styles from './InviteSpeakerPage.module.css'
import listStyles from './AdminListPage.module.css'

export default function InviteSpeakerPage() {
  const { t } = useTranslation()

  const [firstName, setFirstName]           = useState('')
  const [lastName, setLastName]             = useState('')
  const [email, setEmail]                   = useState('')
  const [invitationBody, setInvitationBody] = useState('')
  const [busy, setBusy]                     = useState(false)
  const [success, setSuccess]               = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await inviteSpeaker({ first_name: firstName, last_name: lastName, email, invitation_body: invitationBody })
      setSuccess(true)
      setFirstName('')
      setLastName('')
      setEmail('')
      setInvitationBody('')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.invite.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <span className={listStyles.appName}>{t('dashboard.appName')}</span>
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>

      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.invite.title')}</h1>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t('admin.invite.fieldFirstName')}</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                />
              </label>
              <label className={styles.field}>
                <span>{t('admin.invite.fieldLastName')}</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>{t('admin.invite.fieldEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span>{t('admin.invite.fieldBody')}</span>
              <textarea
                value={invitationBody}
                onChange={e => setInvitationBody(e.target.value)}
                rows={8}
                required
                className={styles.textarea}
              />
            </label>

            {error   && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{t('admin.invite.success', { email })}</p>}

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? t('admin.invite.submitting') : t('admin.invite.submit')}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
