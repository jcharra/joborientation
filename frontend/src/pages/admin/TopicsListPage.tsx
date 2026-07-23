import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminTopics, fetchAdminTags, updateTopicTag } from '../../api/admin'
import type { AdminTopic, Tag } from '../../api/admin'
import { useSortableData } from '../../hooks/useSortableData'
import SortableHeader from '../../components/SortableHeader'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

type TopicColumn = 'title' | 'tag' | 'consultant' | 'description'

function TagCell({
  topic,
  tags,
  onTagChange,
}: {
  topic: AdminTopic
  tags: Tag[]
  onTagChange: (topicId: number, tag: Tag) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState<number | ''>(topic.tag?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!selectedTagId) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateTopicTag(topic.id, selectedTagId)
      if (updated.tag) onTagChange(topic.id, updated.tag)
      setEditing(false)
    } catch {
      setError(t('admin.consultantDetail.errorTagSave'))
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setSelectedTagId(topic.tag?.id ?? '')
    setError(null)
    setEditing(false)
  }

  if (editing) {
    return (
      <>
        <div className={styles.tagEditRow}>
          <select
            value={selectedTagId}
            onChange={e => setSelectedTagId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">—</option>
            {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <button className={styles.tagSaveBtn} onClick={handleSave} disabled={busy || !selectedTagId}>
            {busy ? '…' : t('admin.consultantDetail.saveTag')}
          </button>
          <button className={styles.tagCancelBtn} onClick={handleCancel} disabled={busy}>
            {t('admin.phase.cancel')}
          </button>
        </div>
        {error && <p className={styles.tagError}>{error}</p>}
      </>
    )
  }

  return (
    <button
      type="button"
      className={styles.tagPencilBtn}
      onClick={() => setEditing(true)}
      aria-label={t('admin.consultantDetail.editTag')}
    >
      {topic.tag?.name ?? '—'}
      <span className={styles.tagPencilIcon} aria-hidden="true">✏️</span>
    </button>
  )
}

function TopicsTable({ dataPromise, tagsPromise }: { dataPromise: Promise<AdminTopic[]>; tagsPromise: Promise<Tag[]> }) {
  const initial = use(dataPromise)
  const tags = use(tagsPromise)
  const { t } = useTranslation()
  const [topics, setTopics] = useState(initial)
  const { sorted, sortKey, direction, requestSort } = useSortableData<AdminTopic, TopicColumn>(topics, {
    title: topic => topic.title,
    tag: topic => topic.tag?.name ?? null,
    consultant: topic => topic.consultant?.name ?? null,
    description: topic => topic.description,
  })

  function handleTagChange(topicId: number, tag: Tag) {
    setTopics(prev => prev.map(topic => topic.id === topicId ? { ...topic, tag, tag_id: tag.id } : topic))
  }

  if (topics.length === 0) {
    return <p className={styles.empty}>{t('admin.noData')}</p>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.topic')} sortKey="title" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.tag')} sortKey="tag" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.consultant')} sortKey="consultant" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.description')} sortKey="description" activeKey={sortKey} direction={direction} onSort={requestSort} />
        </tr>
      </thead>
      <tbody>
        {sorted.map(topic => (
          <tr key={topic.id}>
            <td>{topic.title}</td>
            <td><TagCell topic={topic} tags={tags} onTagChange={handleTagChange} /></td>
            <td>{topic.consultant?.name ?? '—'}</td>
            <td>{topic.description ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function TopicsListPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => fetchAdminTopics())
  const [tagsPromise] = useState(() => fetchAdminTags())

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <div className={styles.headerRight}>
          <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('admin.topicsOverview')}</h1>
        <Suspense fallback={<p className={styles.empty}>…</p>}>
          <TopicsTable dataPromise={dataPromise} tagsPromise={tagsPromise} />
        </Suspense>
      </main>
    </div>
  )
}
