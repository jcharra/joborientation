import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { bulkInviteSpeakers } from '../../api/invite'
import type { BulkInviteResult } from '../../api/invite'
import styles from './InviteSpeakerPage.module.css'
import own from './BulkInviteSpeakersPage.module.css'
import listStyles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

export default function BulkInviteSpeakersPage() {
  const { t } = useTranslation()

  const [file, setFile] = useState<File | null>(null)
  const [invitationBody, setInvitationBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<BulkInviteResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await bulkInviteSpeakers(file, invitationBody)
      setResult(res)
      setFile(null)
      setInvitationBody('')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.bulkInvite.errorGeneric')
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
        <h1 className={listStyles.title}>{t('admin.bulkInviteSpeakers')}</h1>

        <div className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              <span>{t('admin.bulkInvite.fieldCsv')}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <span className={own.hint}>{t('admin.bulkInvite.csvHint')}</span>
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
              <span className={own.hint}>{t('admin.bulkInvite.bodyHint')}</span>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <button type="submit" className={styles.submit} disabled={busy || !file}>
              {busy ? t('admin.bulkInvite.submitting') : t('admin.bulkInvite.submit')}
            </button>
          </form>

          {result && (
            <div className={own.resultBox}>
              <p className={styles.success}>
                {t('admin.bulkInvite.resultSummary', { count: result.invited_count })}
              </p>
              {result.skipped.length > 0 && (
                <>
                  <p className={own.skippedTitle}>{t('admin.bulkInvite.skippedTitle')}</p>
                  <ul className={own.skippedList}>
                    {result.skipped.map((row, i) => (
                      <li key={i}>{row.email || '—'}: {row.reason}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
