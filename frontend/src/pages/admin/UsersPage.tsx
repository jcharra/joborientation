import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchConfig, setGraduationYearRange } from '../../api/config'
import type { AppConfig } from '../../api/config'
import { fetchSeries, createSeries, updateSeries, deleteSeries } from '../../api/series'
import type { SeriesOption } from '../../api/series'
import listStyles from './AdminListPage.module.css'
import formStyles from './InviteSpeakerPage.module.css'
import dashboardStyles from '../DashboardPage.module.css'
import styles from './UsersPage.module.css'
import AppTitle from '../../components/AppTitle'

function SeriesRow({
  series,
  onUpdate,
  onDelete,
}: {
  series: SeriesOption
  onUpdate: (updated: SeriesOption) => void
  onDelete: (id: number) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(series.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateSeries(series.id, trimmed)
      onUpdate(updated)
      setEditing(false)
    } catch {
      setError(t('admin.series.errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setName(series.name)
    setError(null)
    setEditing(false)
  }

  if (editing) {
    return (
      <td colSpan={2}>
        <div className={styles.editRow}>
          <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={50} autoFocus />
          <button className={styles.saveBtn} onClick={handleSave} disabled={busy || !name.trim()}>
            {busy ? '…' : t('admin.series.save')}
          </button>
          <button className={styles.cancelBtn} onClick={handleCancel} disabled={busy}>
            {t('admin.phase.cancel')}
          </button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
      </td>
    )
  }

  return (
    <>
      <td>
        <div className={styles.nameRow}>
          <span>{series.name}</span>
          <button
            type="button"
            className={styles.pencilBtn}
            onClick={() => setEditing(true)}
            aria-label={t('admin.consultantDetail.editTag')}
          >
            ✏️
          </button>
        </div>
      </td>
      <td>
        <button className={styles.deleteBtn} onClick={() => onDelete(series.id)}>
          {t('admin.series.delete')}
        </button>
      </td>
    </>
  )
}

function SeriesManager({ dataPromise }: { dataPromise: Promise<SeriesOption[]> }) {
  const initial = use(dataPromise)
  const { t } = useTranslation()

  const [series, setSeries] = useState(initial)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const created = await createSeries(trimmed)
      setSeries(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.series.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  function handleUpdate(updated: SeriesOption) {
    setSeries(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function handleDelete(id: number) {
    const previous = series
    setSeries(prev => prev.filter(s => s.id !== id))
    try {
      await deleteSeries(id)
    } catch {
      setSeries(previous)
    }
  }

  return (
    <>
      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('admin.series.fieldName')}
          maxLength={50}
        />
        <button type="submit" disabled={busy || !name.trim()}>
          {t('admin.series.add')}
        </button>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {series.length === 0 ? (
        <p className={listStyles.empty}>{t('admin.noData')}</p>
      ) : (
        <table className={listStyles.table}>
          <thead>
            <tr>
              <th className={styles.nameCol}>{t('admin.series.fieldName')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {series.map(s => (
              <tr key={s.id}>
                <SeriesRow series={s} onUpdate={handleUpdate} onDelete={handleDelete} />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}

function GraduationYearRangeForm({ config }: { config: AppConfig }) {
  const { t } = useTranslation()
  const latestAllowedYear = new Date().getFullYear() - 1

  const [min, setMin] = useState(String(config.graduation_year_range.min))
  const [max, setMax] = useState(String(config.graduation_year_range.max))
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await setGraduationYearRange({ min: Number(min), max: Number(max) })
      setSuccess(true)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.graduationYearRange.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={formStyles.formCard}>
      <form onSubmit={handleSubmit} className={formStyles.form}>
        <div className={formStyles.row}>
          <label className={formStyles.field}>
            <span>{t('admin.graduationYearRange.fieldMin')}</span>
            <input type="number" value={min} onChange={e => setMin(e.target.value)} min={1900} max={latestAllowedYear} required />
          </label>
          <label className={formStyles.field}>
            <span>{t('admin.graduationYearRange.fieldMax')}</span>
            <input type="number" value={max} onChange={e => setMax(e.target.value)} min={1900} max={latestAllowedYear} required />
          </label>
        </div>

        {error && <p className={formStyles.error}>{error}</p>}
        {success && <p className={formStyles.success}>{t('admin.graduationYearRange.success')}</p>}

        <button type="submit" className={formStyles.submit} disabled={busy}>
          {busy ? t('admin.graduationYearRange.submitting') : t('admin.graduationYearRange.submit')}
        </button>
      </form>
    </div>
  )
}

function UsersPageContent({
  configPromise,
  seriesPromise,
}: {
  configPromise: Promise<AppConfig>
  seriesPromise: Promise<SeriesOption[]>
}) {
  const config = use(configPromise)
  const { t } = useTranslation()

  return (
    <>
      <span className={dashboardStyles.phaseLabel}>{t('admin.seriesOverview')}</span>
      <SeriesManager dataPromise={seriesPromise} />

      <hr className={dashboardStyles.phaseDivider} />
      <span className={dashboardStyles.phaseLabel}>{t('admin.graduationYearRange.title')}</span>
      <GraduationYearRangeForm config={config} />
    </>
  )
}

export default function UsersPage() {
  const { t } = useTranslation()
  const [configPromise] = useState(() => fetchConfig())
  const [seriesPromise] = useState(() => fetchSeries())

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.usersOverview')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <UsersPageContent configPromise={configPromise} seriesPromise={seriesPromise} />
        </Suspense>
      </main>
    </div>
  )
}
