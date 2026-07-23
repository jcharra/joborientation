import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminConsultants } from '../../api/admin'
import type { AdminConsultantListItem } from '../../api/admin'
import { useSortableData } from '../../hooks/useSortableData'
import SortableHeader from '../../components/SortableHeader'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

type ConsultantColumn = 'name' | 'email' | 'tag' | 'activated'

function ConsultantTable({ dataPromise }: { dataPromise: Promise<AdminConsultantListItem[]> }) {
  const consultants = use(dataPromise)
  const { t } = useTranslation()
  const { sorted, sortKey, direction, requestSort } = useSortableData<AdminConsultantListItem, ConsultantColumn>(consultants, {
    name: c => c.name,
    email: c => c.email,
    tag: c => c.topics[0]?.tag?.name ?? null,
    activated: c => c.email_verified_at ? 1 : 0,
  })

  if (consultants.length === 0) {
    return <p className={styles.empty}>{t('admin.noData')}</p>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.name')} sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.email')} sortKey="email" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.tag')} sortKey="tag" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.activated')} sortKey="activated" activeKey={sortKey} direction={direction} onSort={requestSort} />
        </tr>
      </thead>
      <tbody>
        {sorted.map(c => (
          <tr key={c.id}>
            <td><Link to={`/admin/consultants/${c.id}`}>{c.name}</Link></td>
            <td>{c.email ?? '—'}</td>
            <td>{c.topics[0]?.tag?.name ?? '—'}</td>
            <td>
              <span className={c.email_verified_at ? styles.badgeActive : styles.badgePending}>
                {c.email_verified_at ? t('admin.columns.activatedYes') : t('admin.columns.activatedNo')}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function ConsultantsListPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => fetchAdminConsultants())

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <div className={styles.headerRight}>
          <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.titleRow}>
          <h1 className={styles.title} style={{ margin: 0 }}>{t('admin.consultantsOverview')}</h1>
          <div className={styles.actions}>
            <Link to="/admin/invite" className={styles.primaryBtn}>{t('admin.inviteSpeaker')}</Link>
            <Link to="/admin/invite/bulk" className={styles.secondaryBtn}>{t('admin.bulkInviteSpeakers')}</Link>
          </div>
        </div>
        <Suspense fallback={<p className={styles.empty}>…</p>}>
          <ConsultantTable dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
