import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminStudents } from '../../api/admin'
import type { User } from '../../api/auth'
import { useSortableData } from '../../hooks/useSortableData'
import SortableHeader from '../../components/SortableHeader'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

type StudentColumn = 'name' | 'email' | 'ldap_username' | 'last_login_at'

function StudentTable({ dataPromise }: { dataPromise: Promise<User[]> }) {
  const students = use(dataPromise)
  const { t } = useTranslation()
  const { sorted, sortKey, direction, requestSort } = useSortableData<User, StudentColumn>(students, {
    name: s => s.name,
    email: s => s.email,
    ldap_username: s => s.ldap_username,
    last_login_at: s => s.last_login_at ? new Date(s.last_login_at).getTime() : null,
  })

  if (students.length === 0) {
    return <p className={styles.empty}>{t('admin.noData')}</p>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.name')} sortKey="name" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.email')} sortKey="email" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.ldapUsername')} sortKey="ldap_username" activeKey={sortKey} direction={direction} onSort={requestSort} />
          <SortableHeader className={styles.sortableTh} label={t('admin.columns.lastLogin')} sortKey="last_login_at" activeKey={sortKey} direction={direction} onSort={requestSort} />
        </tr>
      </thead>
      <tbody>
        {sorted.map(s => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{s.email ?? '—'}</td>
            <td>{s.ldap_username ?? '—'}</td>
            <td>{s.last_login_at ? new Date(s.last_login_at).toLocaleString() : t('admin.columns.neverLoggedIn')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function StudentsListPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => fetchAdminStudents())

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <div className={styles.headerRight}>
          <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
        </div>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('admin.studentsOverview')}</h1>
        <Suspense fallback={<p className={styles.empty}>…</p>}>
          <StudentTable dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
