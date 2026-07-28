import { Suspense, use, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { fetchConfig } from '../api/config'
import type { AppConfig } from '../api/config'
import { fetchConsultantSession, buildSlotGroups } from '../api/session'
import type { ConsultantSession } from '../api/session'
import { fetchConsultantProfile } from '../api/profile'
import { fetchSeries } from '../api/series'
import { fetchSlotOptions } from '../api/slotOptions'
import type { SlotOption } from '../api/slotOptions'
import { fetchStudentTopics } from '../api/studentTopics'
import type { StudentTopic } from '../api/studentTopics'
import { fetchStudentSelection, saveStudentSelection, MIN_TALK_SELECTIONS, MAX_TALK_SELECTIONS } from '../api/studentSelection'
import type { StudentSelectionData } from '../api/studentSelection'
import { SessionForm, SessionReadOnly } from './ConsultantSessionPage'
import { ProfileForm } from './ConsultantProfilePage'
import styles from './DashboardPage.module.css'
import AppTitle from '../components/AppTitle'

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
        <AppTitle className={styles.appName} />
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
  return (
    <div className={styles.cardWide}>
      <div className={styles.roleTag} data-role="student">{t('dashboard.roleStudent')}</div>
      <h2 className={styles.greeting}>{t('dashboard.greetingStudent', { name })}</h2>
      <p className={styles.subtitle}>{t('dashboard.phaseSelection')}</p>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
        <StudentTopicBrowser />
      </Suspense>
    </div>
  )
}

function StudentTopicBrowser() {
  const [dataPromise] = useState(() => Promise.all([
    fetchStudentTopics(),
    fetchStudentSelection(),
    fetchSlotOptions(),
  ]))

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
      <StudentTopicBrowserContent dataPromise={dataPromise} />
    </Suspense>
  )
}

function StudentTopicBrowserContent({
  dataPromise,
}: {
  dataPromise: Promise<[StudentTopic[], StudentSelectionData, SlotOption[]]>
}) {
  const { t } = useTranslation()
  const [topics, initialSelection, slotOptions] = use(dataPromise)
  const slotGroups = buildSlotGroups(slotOptions, t)

  const [selected, setSelected] = useState<Set<number>>(new Set(initialSelection.topic_ids))
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(topicId: number) {
    setSuccess(false)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(topicId)) {
        next.delete(topicId)
      } else if (next.size < MAX_TALK_SELECTIONS) {
        next.add(topicId)
      }
      return next
    })
  }

  const canSave = selected.size >= MIN_TALK_SELECTIONS && selected.size <= MAX_TALK_SELECTIONS

  async function handleSave() {
    if (!canSave) return
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await saveStudentSelection(Array.from(selected))
      setSuccess(true)
    } catch {
      setError(t('dashboard.selectionErrorSave'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className={styles.selectionCount}>
        {t('dashboard.selectionCount', { count: selected.size, min: MIN_TALK_SELECTIONS, max: MAX_TALK_SELECTIONS })}
      </p>
      <div className={styles.topicList}>
        {topics.map(topic => (
          <TopicRow
            key={topic.id}
            topic={topic}
            selected={selected.has(topic.id)}
            selectionFull={selected.size >= MAX_TALK_SELECTIONS && !selected.has(topic.id)}
            onToggle={() => toggle(topic.id)}
            expanded={expandedId === topic.id}
            onExpandToggle={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
            slotGroups={slotGroups}
          />
        ))}
        {topics.length === 0 && <p className={styles.soonToCome}>{t('dashboard.selectionNoTopics')}</p>}
      </div>
      <div className={styles.footer}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={busy || !canSave}>
          {busy ? t('dashboard.selectionSaving') : t('dashboard.selectionSave')}
        </button>
        {success && <span className={styles.successMsg}>{t('dashboard.selectionSaved')}</span>}
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>
    </div>
  )
}

function TopicRow({
  topic,
  selected,
  selectionFull,
  onToggle,
  expanded,
  onExpandToggle,
  slotGroups,
}: {
  topic: StudentTopic
  selected: boolean
  selectionFull: boolean
  onToggle: () => void
  expanded: boolean
  onExpandToggle: () => void
  slotGroups: ReturnType<typeof buildSlotGroups>
}) {
  const profile = topic.consultant.consultant_profile

  return (
    <div className={styles.topicRow}>
      <div className={styles.topicRowHeader} onClick={onExpandToggle}>
        {profile?.profile_picture_url
          ? <img src={profile.profile_picture_url} alt="" className={styles.topicRowAvatar} />
          : <div className={styles.topicRowAvatarPlaceholder}>👤</div>
        }
        <div className={styles.topicRowInfo}>
          <span className={styles.topicRowTitle}>{topic.title}</span>
          <span className={styles.topicRowConsultant}>{topic.consultant.name}</span>
        </div>
        {topic.tag && <span className={styles.tag}>{topic.tag.name}</span>}
        <label className={styles.topicRowCheckbox} onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={selected} disabled={selectionFull} onChange={onToggle} />
        </label>
      </div>
      {expanded && <TopicDetail topic={topic} slotGroups={slotGroups} />}
    </div>
  )
}

type TopicDetailTab = 'session' | 'profile'

function TopicDetail({ topic, slotGroups }: { topic: StudentTopic; slotGroups: ReturnType<typeof buildSlotGroups> }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<TopicDetailTab>('session')

  const session: ConsultantSession = {
    id: topic.id,
    title: topic.title,
    description: topic.description,
    selected_slots: topic.selected_slots,
    tag: topic.tag,
    time_slots: topic.time_slots,
  }

  return (
    <div className={styles.topicDetail}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'session' ? styles.tabActive : ''}`}
          onClick={() => setTab('session')}
        >
          {t('session.title')}
        </button>
        <button
          className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`}
          onClick={() => setTab('profile')}
        >
          {t('profile.title')}
        </button>
      </div>
      {tab === 'session'
        ? <SessionReadOnly session={session} slotGroups={slotGroups} />
        : <StudentProfileView profile={topic.consultant.consultant_profile} />
      }
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {value != null && value !== ''
        ? <span className={styles.value}>{value}</span>
        : <span className={styles.valueEmpty}>—</span>
      }
    </div>
  )
}

function StudentProfileView({ profile }: { profile: StudentTopic['consultant']['consultant_profile'] }) {
  const { t } = useTranslation()

  if (!profile) {
    return <p className={styles.noData}>{t('admin.consultantDetail.noProfile')}</p>
  }

  return (
    <div className={styles.card}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPhoto')}</p>
        <div className={styles.photoRow}>
          {profile.profile_picture_url
            ? <img src={profile.profile_picture_url} alt="" className={styles.avatar} />
            : <div className={styles.avatarPlaceholder}>👤</div>
          }
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPersonal')}</p>
        <div className={styles.row}>
          <Field label={t('profile.fieldLastName')} value={profile.last_name} />
          <Field label={t('profile.fieldFirstName')} value={profile.first_name} />
        </div>
        <div className={styles.row} style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldGraduationYear')} value={profile.graduation_year} />
          <Field label={t('profile.fieldSerie')} value={profile.serie} />
        </div>
        <div className={styles.row} style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldLinkedin')} value={profile.linkedin_url} />
          <Field label={t('profile.fieldLanguage')} value={profile.language ? t(`lang.${profile.language}`) : null} />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionCareer')}</p>
        <Field label={t('profile.fieldCareerPath')} value={profile.career_path} />
        <div style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldCurrentSituation')} value={profile.current_situation} />
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldWhyThisCareer')} value={profile.why_this_career} />
        </div>
      </div>
    </div>
  )
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
