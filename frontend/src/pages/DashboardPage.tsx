import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  if (!user) return null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.appName}>{t('dashboard.appName')}</span>
        <div className={styles.headerRight}>
          <LanguageSwitcher />
          <button className={styles.logoutBtn} onClick={handleLogout}>
            {t('dashboard.signOut')}
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {user.role === 'student' && <StudentDashboard name={user.name} />}
        {user.role === 'consultant' && <ConsultantDashboard name={user.name} />}
        {user.role === 'admin' && <AdminDashboard name={user.name} />}
      </main>
    </div>
  )
}

function StudentDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const actions = t('dashboard.studentActions', { returnObjects: true }) as string[]
  return (
    <div className={styles.card}>
      <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.phaseSelection')}</p>
      <ul className={styles.actionList}>
        {actions.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function ConsultantDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const actions = t('dashboard.consultantActions', { returnObjects: true }) as string[]
  return (
    <div className={styles.card}>
      <div className={styles.roleTag} data-role="consultant">{t('dashboard.roleConsultant')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingConsultant', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.phaseSelection')}</p>
      <ul className={styles.actionList}>
        {actions.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function AdminDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const navItems: { label: string; to: string }[] = [
    { label: t('admin.studentsOverview'), to: '/admin/students' },
    { label: t('admin.consultantsOverview'), to: '/admin/consultants' },
    { label: t('admin.topicsOverview'), to: '/admin/topics' },
  ]
  return (
    <div className={styles.card}>
      <div className={styles.roleTag} data-role="admin">{t('dashboard.roleAdmin')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingAdmin', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.adminSubtitle')}</p>
      <div className={styles.adminNav}>
        {navItems.map(item => (
          <Link key={item.to} to={item.to} className={styles.adminNavCard}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
