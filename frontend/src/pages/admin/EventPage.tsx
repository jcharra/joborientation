import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchConfig, setEventDetails, setEventTitle, setPhase } from '../../api/config'
import type { AppConfig, Phase } from '../../api/config'
import { fetchAdminTags, createTag, deleteTag } from '../../api/admin'
import type { Tag } from '../../api/admin'
import { useEventTitle } from '../../contexts/EventTitleContext'
import listStyles from './AdminListPage.module.css'
import formStyles from './InviteSpeakerPage.module.css'
import dashboardStyles from '../DashboardPage.module.css'
import styles from './EventPage.module.css'
import AppTitle from '../../components/AppTitle'

function EventDetailsForm({ config }: { config: AppConfig }) {
  const { t } = useTranslation()

  const [eventDatetime, setEventDatetimeState] = useState(config.event_datetime ?? '')
  const [eventLocation, setEventLocationState] = useState(config.event_location ?? '')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await setEventDetails({
        event_datetime: eventDatetime || null,
        event_location: eventLocation || null,
      })
      setSuccess(true)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.eventDetails.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={formStyles.formCard}>
      <form onSubmit={handleSubmit} className={formStyles.form}>
        <label className={formStyles.field}>
          <span>{t('admin.eventDetails.fieldDatetime')}</span>
          <input
            type="datetime-local"
            value={eventDatetime}
            onChange={e => setEventDatetimeState(e.target.value)}
          />
        </label>
        <label className={formStyles.field}>
          <span>{t('admin.eventDetails.fieldLocation')}</span>
          <input
            type="text"
            value={eventLocation}
            onChange={e => setEventLocationState(e.target.value)}
            maxLength={255}
          />
        </label>

        {error && <p className={formStyles.error}>{error}</p>}
        {success && <p className={formStyles.success}>{t('admin.eventDetails.success')}</p>}

        <button type="submit" className={formStyles.submit} disabled={busy}>
          {busy ? t('admin.eventDetails.submitting') : t('admin.eventDetails.submit')}
        </button>
      </form>
    </div>
  )
}

function EventTitleForm({ config }: { config: AppConfig }) {
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
    <div className={formStyles.formCard}>
      <form onSubmit={handleSubmit} className={formStyles.form}>
        <label className={formStyles.field}>
          <span>{t('admin.eventTitle.fieldEn')}</span>
          <input type="text" value={en} onChange={e => setEn(e.target.value)} required maxLength={150} />
        </label>
        <label className={formStyles.field}>
          <span>{t('admin.eventTitle.fieldDe')}</span>
          <input type="text" value={de} onChange={e => setDe(e.target.value)} required maxLength={150} />
        </label>
        <label className={formStyles.field}>
          <span>{t('admin.eventTitle.fieldFr')}</span>
          <input type="text" value={fr} onChange={e => setFr(e.target.value)} required maxLength={150} />
        </label>

        {error && <p className={formStyles.error}>{error}</p>}
        {success && <p className={formStyles.success}>{t('admin.eventTitle.success')}</p>}

        <button type="submit" className={formStyles.submit} disabled={busy}>
          {busy ? t('admin.eventTitle.submitting') : t('admin.eventTitle.submit')}
        </button>
      </form>
    </div>
  )
}

function TagsManager({ dataPromise }: { dataPromise: Promise<Tag[]> }) {
  const initial = use(dataPromise)
  const { t } = useTranslation()

  const [tags, setTags] = useState(initial)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function extractErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
    return anyErr?.response?.data?.errors
      ? Object.values(anyErr.response.data.errors).flat().join(' ')
      : anyErr?.response?.data?.message ?? fallback
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const created = await createTag(trimmed)
      setTags(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
    } catch (err: unknown) {
      setError(extractErrorMessage(err, t('admin.tags.errorGeneric')))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    const previous = tags
    setTags(prev => prev.filter(tag => tag.id !== id))
    try {
      await deleteTag(id)
    } catch (err: unknown) {
      setTags(previous)
      setError(extractErrorMessage(err, t('admin.tags.errorDelete')))
    }
  }

  return (
    <>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('admin.tags.fieldName')}
          maxLength={100}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          {t('admin.tags.add')}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {tags.length === 0 ? (
        <p className={listStyles.empty}>{t('admin.noData')}</p>
      ) : (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th className={styles.nameCol}>{t('admin.tags.fieldName')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {tags.map(tag => (
              <tr key={tag.id}>
                <td>{tag.name}</td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(tag.id)}>
                    {t('admin.tags.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function PhaseSwitcher({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const [phase, setPhaseState] = useState<Phase>(config.current_phase)
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null)
  const [switching, setSwitching] = useState(false)

  const phases: Phase[] = ['preparation', 'selection', 'conference']

  async function confirmSwitch() {
    if (!pendingPhase) return
    setSwitching(true)
    try {
      await setPhase(pendingPhase)
      setPhaseState(pendingPhase)
    } finally {
      setSwitching(false)
      setPendingPhase(null)
    }
  }

  return (
    <>
      <span className={dashboardStyles.phaseLabel}>{t('admin.phase.title')}</span>
      <div className={dashboardStyles.phaseOptions}>
        {phases.map(p => (
          <button
            key={p}
            className={dashboardStyles.phaseOption}
            data-active={p === phase}
            disabled={switching || p === phase}
            onClick={() => setPendingPhase(p)}
          >
            <div className={dashboardStyles.phaseOptionDot} data-active={p === phase} />
            <div>
              <div className={dashboardStyles.phaseOptionName}>{t(`admin.phase.${p}`)}</div>
              <div className={dashboardStyles.phaseOptionDesc}>{t(`admin.phase.${p}Desc`)}</div>
            </div>
          </button>
        ))}
      </div>

      {pendingPhase && (
        <div className={dashboardStyles.dialogOverlay} onClick={() => !switching && setPendingPhase(null)}>
          <div className={dashboardStyles.dialog} onClick={e => e.stopPropagation()}>
            <h3 className={dashboardStyles.dialogTitle}>
              {t('admin.phase.switchTitle', { phase: t(`admin.phase.${pendingPhase}`) })}
            </h3>
            <p className={dashboardStyles.dialogDesc}>{t(`admin.phase.${pendingPhase}Desc`)}</p>
            <p className={dashboardStyles.dialogWarning}>{t('admin.phase.switchWarning')}</p>
            <div className={dashboardStyles.dialogActions}>
              <button
                className={dashboardStyles.dialogCancel}
                onClick={() => setPendingPhase(null)}
                disabled={switching}
              >
                {t('admin.phase.cancel')}
              </button>
              <button
                className={dashboardStyles.dialogConfirm}
                onClick={confirmSwitch}
                disabled={switching}
              >
                {switching ? '…' : t('admin.phase.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EventPageContent({
  configPromise,
  tagsPromise,
}: {
  configPromise: Promise<AppConfig>
  tagsPromise: Promise<Tag[]>
}) {
  const config = use(configPromise)
  const { t } = useTranslation()

  return (
    <>
      <EventDetailsForm config={config} />

      <hr className={dashboardStyles.phaseDivider} />
      <span className={dashboardStyles.phaseLabel}>{t('admin.eventTitleOverview')}</span>
      <EventTitleForm config={config} />

      <hr className={dashboardStyles.phaseDivider} />
      <span className={dashboardStyles.phaseLabel}>{t('admin.tagsOverview')}</span>
      <TagsManager dataPromise={tagsPromise} />

      <hr className={dashboardStyles.phaseDivider} />
      <PhaseSwitcher config={config} />
    </>
  )
}

export default function EventPage() {
  const { t } = useTranslation()
  const [configPromise] = useState(() => fetchConfig())
  const [tagsPromise] = useState(() => fetchAdminTags())

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.eventSection')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <EventPageContent configPromise={configPromise} tagsPromise={tagsPromise} />
        </Suspense>
      </main>
    </div>
  )
}
