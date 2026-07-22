import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchSeries, createSeries, deleteSeries } from '../../api/series'
import type { SeriesOption } from '../../api/series'
import listStyles from './AdminListPage.module.css'
import styles from './SeriesListPage.module.css'
import AppTitle from '../../components/AppTitle'

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
                <td>{s.name}</td>
                <td>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(s.id)}>
                    {t('admin.series.delete')}
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

export default function SeriesListPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => fetchSeries())

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.seriesOverview')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <SeriesManager dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
