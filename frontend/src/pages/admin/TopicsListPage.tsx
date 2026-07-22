import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminTopics } from '../../api/admin'
import type { AdminTopic } from '../../api/admin'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

function TopicsTable({ dataPromise }: { dataPromise: Promise<AdminTopic[]> }) {
  const topics = use(dataPromise)
  const { t } = useTranslation()

  if (topics.length === 0) {
    return <p className={styles.empty}>{t('admin.noData')}</p>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('admin.columns.topic')}</th>
          <th>{t('admin.columns.tag')}</th>
          <th>{t('admin.columns.consultant')}</th>
          <th>{t('admin.columns.description')}</th>
        </tr>
      </thead>
      <tbody>
        {topics.map(topic => (
          <tr key={topic.id}>
            <td>{topic.title}</td>
            <td><span className={styles.tag}>{topic.tag?.name ?? '—'}</span></td>
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
          <TopicsTable dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
