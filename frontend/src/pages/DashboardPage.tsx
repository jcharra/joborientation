import { Suspense, use, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { fetchConfig } from '../api/config'
import type { AppConfig } from '../api/config'
import { fetchConsultantSession, buildSlotGroups } from '../api/session'
import { fetchConsultantProfile } from '../api/profile'
import { fetchSeries } from '../api/series'
import { fetchSlotOptions } from '../api/slotOptions'
import { fetchStudentSelection, MIN_TALK_SELECTIONS } from '../api/studentSelection'
import { formatPhaseDate } from '../utils/formatPhaseDate'
import { SessionForm, SessionReadOnly } from './ConsultantSessionPage'
import { ProfileForm } from './ConsultantProfilePage'
import mainImage from '../../public/fdm.png'
import styles from './DashboardPage.module.css'

const configPromise = fetchConfig()

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className={styles.page}>
      <TopBar />

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
    const selectionInfo = config.selection_phase_start
      ? t('dashboard.prepSelectionInfo', { date: formatPhaseDate(config.selection_phase_start) })
      : t('dashboard.prepSelectionInfoUnknown')
    const conferenceInfo = config.conference_phase_start
      ? t('dashboard.prepConferenceInfo', { date: formatPhaseDate(config.conference_phase_start) })
      : t('dashboard.prepConferenceInfoUnknown')

    return (
      <div className={styles.card}>
        <img className={styles.banner} src={mainImage} alt="" />
        <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
        <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
        <p className={styles.subtitle}>{t('dashboard.prepIntro', { selectionInfo, conferenceInfo })}</p>
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
  return (
    <div className={styles.card}>
      <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.phaseSelection')}</p>
      <Suspense fallback={null}>
        <StudentSelectionMissingHint />
      </Suspense>
      <Link to="/select-talks" className={styles.primaryBtn}>{t('dashboard.selectTalksButton')}</Link>
    </div>
  )
}

function StudentSelectionMissingHint() {
  const { t } = useTranslation()
  const [selectionPromise] = useState(fetchStudentSelection)
  const selection = use(selectionPromise)
  const missing = Math.max(0, MIN_TALK_SELECTIONS - selection.topic_ids.length)

  if (missing <= 0) return null

  return <p className={styles.selectionMissingHint}>{t('dashboard.selectionMissingHint', { count: missing })}</p>
}

function ConsultantDashboard({ name }: { name: string }) {
  const { t } = useTranslation()
  const config = use(configPromise)
  const isConference = config.current_phase === 'conference'

  return (
    <div className={styles.cardWide}>
      <div className={styles.roleTag} data-role="consultant">{t('dashboard.roleConsultant')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingConsultant', { name })}</h2>
      {isConference ? (
        <>
          <p className={styles.subtitle}>{t('dashboard.consultantPhaseConference')}</p>
          <ul className={styles.actionList}>
            {(t('dashboard.consultantConferenceActions', { returnObjects: true }) as string[])
              .map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </>
      ) : (
        <p className={styles.subtitle}>{t('dashboard.consultantIntro')}</p>
      )}
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
        <ConsultantTabs config={config} sessionReadOnly={isConference} />
      </Suspense>
    </div>
  )
}

type ConsultantTab = 'session' | 'profile'

function ConsultantTabs({ config, sessionReadOnly }: { config: AppConfig; sessionReadOnly: boolean }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<ConsultantTab>('session')
  const [sessionPromise] = useState(fetchConsultantSession)
  const [slotOptionsPromise] = useState(fetchSlotOptions)
  const [profilePromise] = useState(fetchConsultantProfile)
  const [seriesPromise] = useState(fetchSeries)

  return (
    <>
      <div className={styles.tabs} style={{ marginTop: '1.25rem' }}>
        <button
          className={`${styles.tab} ${activeTab === 'session' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('session')}
        >
          {t('session.title')}
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          {t('profile.title')}
        </button>
      </div>

      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
        {activeTab === 'session'
          ? <SessionTabContent sessionPromise={sessionPromise} slotOptionsPromise={slotOptionsPromise} readOnly={sessionReadOnly} />
          : <ProfileTabContent profilePromise={profilePromise} seriesPromise={seriesPromise} config={config} />
        }
      </Suspense>
    </>
  )
}

function SessionTabContent({
  sessionPromise,
  slotOptionsPromise,
  readOnly,
}: {
  sessionPromise: ReturnType<typeof fetchConsultantSession>
  slotOptionsPromise: ReturnType<typeof fetchSlotOptions>
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const initial = use(sessionPromise)
  const slotOptions = use(slotOptionsPromise)
  const slotGroups = buildSlotGroups(slotOptions, t)
  return readOnly
    ? <SessionReadOnly session={initial} slotGroups={slotGroups} />
    : <SessionForm initial={initial} slotGroups={slotGroups} />
}

function ProfileTabContent({
  profilePromise,
  seriesPromise,
  config,
}: {
  profilePromise: ReturnType<typeof fetchConsultantProfile>
  seriesPromise: ReturnType<typeof fetchSeries>
  config: AppConfig
}) {
  const initial = use(profilePromise)
  const seriesOptions = use(seriesPromise)
  return <ProfileForm initial={initial} seriesOptions={seriesOptions} graduationYearRange={config.graduation_year_range} />
}

function AdminDashboard({ name }: { name: string }) {
  const { t } = useTranslation()

  const navItems: { label: string; to: string }[] = [
    { label: t('admin.studentsOverview'), to: '/admin/students' },
    { label: t('admin.consultantsOverview'), to: '/admin/consultants' },
    { label: t('admin.topicsOverview'), to: '/admin/topics' },
    { label: t('admin.eventSection'), to: '/admin/event' },
    { label: t('admin.settingsOverview'), to: '/admin/users' },
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
