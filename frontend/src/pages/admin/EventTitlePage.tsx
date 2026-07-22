import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchConfig, setEventTitle } from '../../api/config'
import type { AppConfig } from '../../api/config'
import listStyles from './AdminListPage.module.css'
import styles from './InviteSpeakerPage.module.css'
import AppTitle from '../../components/AppTitle'
import { useEventTitle } from '../../contexts/EventTitleContext'

function EventTitleForm({ configPromise }: { configPromise: Promise<AppConfig> }) {
  const config = use(configPromise)
  const { t } = useTranslation()

  const [en, setEn] = useState(config.event_title.en)
  const [de, setDe] = useState(config.event_title.de)
  const [fr, setFr] = useState(config.event_title.fr)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setEventTitle: setSharedEventTitle } = useEventTitle()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await setEventTitle({ en, de, fr })
      setSharedEventTitle({ en, de, fr })
      setSuccess(true)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.eventTitle.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.formCard}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>{t('admin.eventTitle.fieldEn')}</span>
          <input type="text" value={en} onChange={e => setEn(e.target.value)} required maxLength={150} />
        </label>
        <label className={styles.field}>
          <span>{t('admin.eventTitle.fieldDe')}</span>
          <input type="text" value={de} onChange={e => setDe(e.target.value)} required maxLength={150} />
        </label>
        <label className={styles.field}>
          <span>{t('admin.eventTitle.fieldFr')}</span>
          <input type="text" value={fr} onChange={e => setFr(e.target.value)} required maxLength={150} />
        </label>

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{t('admin.eventTitle.success')}</p>}

        <button type="submit" className={styles.submit} disabled={busy}>
          {busy ? t('admin.eventTitle.submitting') : t('admin.eventTitle.submit')}
        </button>
      </form>
    </div>
  )
}

export default function EventTitlePage() {
  const { t } = useTranslation()
  const [configPromise] = useState(() => fetchConfig())

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.eventTitleOverview')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <EventTitleForm configPromise={configPromise} />
        </Suspense>
      </main>
    </div>
  )
}
