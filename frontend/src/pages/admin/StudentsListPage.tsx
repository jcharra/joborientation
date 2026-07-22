import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminStudents } from '../../api/admin'
import type { User } from '../../api/auth'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

function StudentTable({ dataPromise }: { dataPromise: Promise<User[]> }) {
  const students = use(dataPromise)
  const { t } = useTranslation()

  if (students.length === 0) {
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
        {students.map(s => (
          <tr key={s.id}>
            <td>{s.name}</td>
            <td>{s.email ?? '—'}</td>
            <td>{s.ldap_username ?? '—'}</td>
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
