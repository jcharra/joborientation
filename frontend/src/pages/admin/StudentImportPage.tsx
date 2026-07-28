import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { importStudents } from '../../api/admin'
import type { StudentImportResult } from '../../api/admin'
import formStyles from './InviteSpeakerPage.module.css'
import own from './StudentImportPage.module.css'
import listStyles from './AdminListPage.module.css'
import TopBar from '../../components/TopBar'

export default function StudentImportPage() {
  const { t } = useTranslation()

  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<StudentImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const res = await importStudents(file)
      setResult(res)
      setFile(null)
    } catch (err: unknown) {
      const anyErr = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } }
      const msg = anyErr?.response?.data?.errors
        ? Object.values(anyErr.response.data.errors).flat().join(' ')
        : anyErr?.response?.data?.message ?? t('admin.studentImport.errorGeneric')
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={listStyles.page}>
      <TopBar backTo="/admin/students" backLabel={t('admin.backToStudents')} />

      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.studentImport.title')}</h1>

        <div className={formStyles.formCard}>
          <form onSubmit={handleSubmit} className={formStyles.form}>
            <label className={formStyles.field}>
              <span>{t('admin.studentImport.fieldCsv')}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <span className={own.hint}>{t('admin.studentImport.csvHint')}</span>
            </label>

            {error && <p className={formStyles.error}>{error}</p>}

            <button type="submit" className={formStyles.submit} disabled={busy || !file}>
              {busy ? t('admin.studentImport.submitting') : t('admin.studentImport.submit')}
            </button>
          </form>

          {result && (
            <div className={own.resultBox}>
              <p className={formStyles.success}>
                {t('admin.studentImport.resultSummary', { count: result.imported_count })}
              </p>
              {result.skipped.length > 0 && (
                <>
                  <p className={own.skippedTitle}>{t('admin.studentImport.skippedTitle')}</p>
                  <ul className={own.skippedList}>
                    {result.skipped.map((row, i) => (
                      <li key={i}>{row.username || '—'}: {row.reason}</li>
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
