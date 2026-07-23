import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchConfig, setGraduationYearRange } from '../../api/config'
import type { AppConfig } from '../../api/config'
import listStyles from './AdminListPage.module.css'
import formStyles from './InviteSpeakerPage.module.css'
import dashboardStyles from '../DashboardPage.module.css'
import AppTitle from '../../components/AppTitle'

function GraduationYearRangeForm({ config }: { config: AppConfig }) {
  const { t } = useTranslation()

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
            <input type="number" value={min} onChange={e => setMin(e.target.value)} min={1900} max={2100} required />
          </label>
          <label className={formStyles.field}>
            <span>{t('admin.graduationYearRange.fieldMax')}</span>
            <input type="number" value={max} onChange={e => setMax(e.target.value)} min={1900} max={2100} required />
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

function UsersPageContent({ configPromise }: { configPromise: Promise<AppConfig> }) {
  const config = use(configPromise)
  const { t } = useTranslation()

  return (
    <>
      <div className={dashboardStyles.adminNav}>
        <Link to="/admin/series" className={dashboardStyles.adminNavCard}>{t('admin.seriesOverview')}</Link>
      </div>

      <hr className={dashboardStyles.phaseDivider} />
      <span className={dashboardStyles.phaseLabel}>{t('admin.graduationYearRange.title')}</span>
      <GraduationYearRangeForm config={config} />
    </>
  )
}

export default function UsersPage() {
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
        <h1 className={listStyles.title}>{t('admin.usersOverview')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <UsersPageContent configPromise={configPromise} />
        </Suspense>
      </main>
    </div>
  )
}
