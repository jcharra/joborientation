import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchConfig, removeEventLogo, setEventDetails, setEventLogo, setEventTitle, setPhase } from '../../api/config'
import type { AppConfig, Phase } from '../../api/config'
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
      await setEventTitle({ de, fr })
      setSharedEventTitle({ de, fr })
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

function EventLogoForm({ config }: { config: AppConfig }) {
  const { t } = useTranslation()

  const [logoUrl, setLogoUrl] = useState(config.event_logo_url)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(config.event_logo_url)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setEventLogoUrl: setSharedEventLogoUrl } = useEventTitle()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f) setPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      const result = await setEventLogo(file)
      setLogoUrl(result.event_logo_url)
      setSharedEventLogoUrl(result.event_logo_url)
      setFile(null)
      setSuccess(true)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.eventLogo.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      await removeEventLogo()
      setLogoUrl(null)
      setPreview(null)
      setSharedEventLogoUrl(null)
    } catch {
      setError(t('admin.eventLogo.errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={formStyles.formCard}>
      <form onSubmit={handleSubmit} className={formStyles.form}>
        <div className={styles.logoRow}>
          {preview
            ? <img src={preview} alt="" className={styles.logoPreview} />
            : <div className={styles.logoPlaceholder}>—</div>
          }
          <label className={formStyles.field}>
            <span>{t('admin.eventLogo.fieldFile')}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
        </div>

        {error && <p className={formStyles.error}>{error}</p>}
        {success && <p className={formStyles.success}>{t('admin.eventLogo.success')}</p>}

        <div className={styles.logoActions}>
          <button type="submit" className={formStyles.submit} disabled={busy || !file}>
            {busy ? t('admin.eventLogo.submitting') : t('admin.eventLogo.submit')}
          </button>
          {logoUrl && (
            <button type="button" className={styles.removeBtn} onClick={handleRemove} disabled={busy}>
              {t('admin.eventLogo.remove')}
            </button>
          )}
        </div>
      </form>
    </div>
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
}: {
  configPromise: Promise<AppConfig>
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
      <span className={dashboardStyles.phaseLabel}>{t('admin.eventLogoOverview')}</span>
      <EventLogoForm config={config} />

      <hr className={dashboardStyles.phaseDivider} />
      <PhaseSwitcher config={config} />
    </>
  )
}

export default function EventPage() {
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
        <h1 className={listStyles.title}>{t('admin.eventSection')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <EventPageContent configPromise={configPromise} />
        </Suspense>
      </main>
    </div>
  )
}
