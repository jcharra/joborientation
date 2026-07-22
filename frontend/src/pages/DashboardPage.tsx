import { Suspense, use, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { fetchConfig, setPhase } from '../api/config'
import type { Phase } from '../api/config'
import styles from './DashboardPage.module.css'

const configPromise = fetchConfig()

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
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
          {user.role === 'student' && <StudentDashboard name={user.name} />}
          {user.role === 'consultant' && <ConsultantDashboard name={user.name} />}
          {user.role === 'admin' && <AdminDashboard name={user.name} />}
        </Suspense>
      </main>
    </div>
  )
}

function StudentDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const config = use(configPromise)
  const phase = config.current_phase

  if (phase === 'preparation') {
    return (
      <div className={styles.card}>
        <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
        <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
        <p className={styles.subtitle}>{t('dashboard.phasePreparation')}</p>
        <p className={styles.soonToCome}>{t('dashboard.soonToCome')}</p>
      </div>
    )
  }

  if (phase === 'conference') {
    const actions = t('dashboard.studentConferenceActions', { returnObjects: true }) as string[]
    return (
      <div className={styles.card}>
        <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
        <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
        <p className={styles.subtitle}>{t('dashboard.phaseConference')}</p>
        <ul className={styles.actionList}>
          {actions.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    )
  }

  // selection phase
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
  const config = use(configPromise)
  const phase = config.current_phase

  if (phase === 'conference') {
    const actions = t('dashboard.consultantConferenceActions', { returnObjects: true }) as string[]
    return (
      <div className={styles.card}>
        <div className={styles.roleTag} data-role="consultant">{t('dashboard.roleConsultant')}</div>
        <h2 className={styles.greeting}>{t('dashboard.greetingConsultant', { name })}</h2>
        <p className={styles.subtitle}>{t('dashboard.consultantPhaseConference')}</p>
        <ul className={styles.actionList}>
          {actions.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    )
  }

  // preparation + selection: can edit profile and session
  const actions = t('dashboard.consultantActions', { returnObjects: true }) as string[]
  return (
    <div className={styles.card}>
      <div className={styles.roleTag} data-role="consultant">{t('dashboard.roleConsultant')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingConsultant', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.phaseSelection')}</p>
      <ul className={styles.actionList}>
        {actions.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
      <div className={styles.adminNav} style={{ marginTop: '1.25rem' }}>
        <Link to="/profile" className={styles.adminNavCard}>{t('profile.editProfile')}</Link>
        <Link to="/session" className={styles.adminNavCard}>{t('session.editSession')}</Link>
      </div>
    </div>
  )
}

function AdminDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const config = use(configPromise)
  const [phase, setPhaseState] = useState<Phase>(config.current_phase)
  const [pendingPhase, setPendingPhase] = useState<Phase | null>(null)
  const [switching, setSwitching] = useState(false)

  const phases: Phase[] = ['preparation', 'selection', 'conference']

  async function confirmSwitch() {
    if (!pendingPhase) return
    setSwitching(true)
    try {
      await setPhase(pendingPhase)
      setPhaseState(pendingPhase)
    } finally {
      setSwitching(false)
      setPendingPhase(null)
    }
  }

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

      <hr className={styles.phaseDivider} />
      <span className={styles.phaseLabel}>{t('admin.phase.title')}</span>
      <div className={styles.phaseOptions}>
        {phases.map(p => (
          <button
            key={p}
            className={styles.phaseOption}
            data-active={p === phase}
            disabled={switching || p === phase}
            onClick={() => setPendingPhase(p)}
          >
            <div className={styles.phaseOptionDot} data-active={p === phase} />
            <div>
              <div className={styles.phaseOptionName}>{t(`admin.phase.${p}`)}</div>
              <div className={styles.phaseOptionDesc}>{t(`admin.phase.${p}Desc`)}</div>
            </div>
          </button>
        ))}
      </div>

      {pendingPhase && (
        <div className={styles.dialogOverlay} onClick={() => !switching && setPendingPhase(null)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>
              {t('admin.phase.switchTitle', { phase: t(`admin.phase.${pendingPhase}`) })}
            </h3>
            <p className={styles.dialogDesc}>{t(`admin.phase.${pendingPhase}Desc`)}</p>
            <p className={styles.dialogWarning}>{t('admin.phase.switchWarning')}</p>
            <div className={styles.dialogActions}>
              <button
                className={styles.dialogCancel}
                onClick={() => setPendingPhase(null)}
                disabled={switching}
              >
                {t('admin.phase.cancel')}
              </button>
              <button
                className={styles.dialogConfirm}
                onClick={confirmSwitch}
                disabled={switching}
              >
                {switching ? '…' : t('admin.phase.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
