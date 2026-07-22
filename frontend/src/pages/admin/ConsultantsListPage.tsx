import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminConsultants } from '../../api/admin'
import type { User } from '../../api/auth'
import styles from './AdminListPage.module.css'
import AppTitle from '../../components/AppTitle'

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
          <th>{t('admin.columns.activated')}</th>
        </tr>
      </thead>
      <tbody>
        {consultants.map(c => (
          <tr key={c.id}>
            <td><Link to={`/admin/consultants/${c.id}`}>{c.name}</Link></td>
            <td>{c.email ?? '—'}</td>
            <td>{c.ldap_username ?? '—'}</td>
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
