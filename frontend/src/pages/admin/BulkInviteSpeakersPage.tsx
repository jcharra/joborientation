import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { bulkInviteSpeakers } from '../../api/invite'
import type { BulkInviteResult } from '../../api/invite'
import styles from './InviteSpeakerPage.module.css'
import own from './BulkInviteSpeakersPage.module.css'
import listStyles from './AdminListPage.module.css'
import TopBar from '../../components/TopBar'

export default function BulkInviteSpeakersPage() {
  const { t } = useTranslation()

  const [file, setFile] = useState<File | null>(null)
  const [invitationBodyDe, setInvitationBodyDe] = useState('')
  const [invitationBodyFr, setInvitationBodyFr] = useState('')
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
      const res = await bulkInviteSpeakers(file, invitationBodyDe, invitationBodyFr)
      setResult(res)
      setFile(null)
      setInvitationBodyDe('')
      setInvitationBodyFr('')
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
      <TopBar backTo="/admin/consultants" backLabel={t('admin.consultantDetail.backToList')} />

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
              <span>{t('admin.invite.fieldBodyDe')}</span>
              <textarea
                value={invitationBodyDe}
                onChange={e => setInvitationBodyDe(e.target.value)}
                rows={6}
                required
                className={styles.textarea}
              />
              <span className={own.hint}>{t('admin.bulkInvite.bodyHint')}</span>
            </label>

            <label className={styles.field}>
              <span>{t('admin.invite.fieldBodyFr')}</span>
              <textarea
                value={invitationBodyFr}
                onChange={e => setInvitationBodyFr(e.target.value)}
                rows={6}
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
