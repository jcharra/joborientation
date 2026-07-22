import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { inviteSpeaker, SALUTATION_OPTIONS } from '../../api/invite'
import styles from './InviteSpeakerPage.module.css'
import listStyles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

export default function InviteSpeakerPage() {
  const { t } = useTranslation()

  const [salutation, setSalutation]         = useState('')
  const [firstName, setFirstName]           = useState('')
  const [lastName, setLastName]             = useState('')
  const [email, setEmail]                   = useState('')
  const [invitationBody, setInvitationBody] = useState('')
  const [busy, setBusy]                     = useState(false)
  const [success, setSuccess]               = useState(false)
  const [invitedEmail, setInvitedEmail]      = useState('')
  const [error, setError]                   = useState<string | null>(null)

  function withFeedbackCleared<E extends { target: { value: string } }>(setter: (value: string) => void) {
    return (e: E) => {
      setSuccess(false)
      setter(e.target.value)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await inviteSpeaker({
        salutation,
        first_name: firstName,
        last_name: lastName,
        email,
        invitation_body: invitationBody,
      })
      setInvitedEmail(email)
      setSuccess(true)
      setSalutation('')
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
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/admin/consultants" className={listStyles.backBtn}>
            {t('admin.consultantDetail.backToList')}
          </Link>
        </div>
      </header>

      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.invite.title')}</h1>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.row}>
              <label className={styles.field}>
                <span>{t('admin.invite.fieldSalutation')}</span>
                <select
                  value={salutation}
                  onChange={withFeedbackCleared(setSalutation)}
                  required
                  autoComplete="honorific-prefix"
                >
                  <option value="" disabled>
                    {t('admin.invite.fieldSalutationPlaceholder')}
                  </option>
                  {SALUTATION_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t('admin.invite.fieldFirstName')}</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={withFeedbackCleared(setFirstName)}
                  required
                  autoComplete="given-name"
                />
              </label>
              <label className={styles.field}>
                <span>{t('admin.invite.fieldLastName')}</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={withFeedbackCleared(setLastName)}
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
                onChange={withFeedbackCleared(setEmail)}
                required
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span>{t('admin.invite.fieldBody')}</span>
              <textarea
                value={invitationBody}
                onChange={withFeedbackCleared(setInvitationBody)}
                rows={8}
                required
                className={styles.textarea}
              />
              <span className={styles.hint}>{t('admin.invite.bodyHint')}</span>
            </label>

            {error   && <p className={styles.error}>{error}</p>}
            {success && <p className={styles.success}>{t('admin.invite.success', { email: invitedEmail })}</p>}

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? t('admin.invite.submitting') : t('admin.invite.submit')}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
