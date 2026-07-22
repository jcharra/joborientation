import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminConsultants } from '../../api/admin'
import type { User } from '../../api/auth'
import styles from './AdminListPage.module.css'

function ConsultantTable({ dataPromise }: { dataPromise: Promise<User[]> }) {
  const consultants = use(dataPromise)
  const { t } = useTranslation()

  if (consultants.length === 0) {
    return <p className={styles.empty}>{t('admin.noData')}</p>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>{t('admin.columns.name')}</th>
          <th>{t('admin.columns.email')}</th>
          <th>{t('admin.columns.ldapUsername')}</th>
        </tr>
      </thead>
      <tbody>
        {consultants.map(c => (
          <tr key={c.id}>
            <td><Link to={`/admin/consultants/${c.id}`}>{c.name}</Link></td>
            <td>{c.email ?? '—'}</td>
            <td>{c.ldap_username ?? '—'}</td>
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
        <span className={styles.appName}>{t('dashboard.appName')}</span>
        <div className={styles.headerRight}>
          <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('admin.consultantsOverview')}</h1>
        <Suspense fallback={<p className={styles.empty}>…</p>}>
          <ConsultantTable dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
