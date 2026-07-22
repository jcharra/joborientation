import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminTags, createTag, deleteTag } from '../../api/admin'
import type { Tag } from '../../api/admin'
import listStyles from './AdminListPage.module.css'
import styles from './TagsListPage.module.css'
import AppTitle from '../../components/AppTitle'

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

export default function TagsListPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => fetchAdminTags())

  return (
    <div className={listStyles.page}>
      <header className={listStyles.header}>
        <AppTitle className={listStyles.appName} />
        <div className={listStyles.headerRight}>
          <Link to="/dashboard" className={listStyles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={listStyles.main}>
        <h1 className={listStyles.title}>{t('admin.tagsOverview')}</h1>
        <Suspense fallback={<p className={listStyles.empty}>…</p>}>
          <TagsManager dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
