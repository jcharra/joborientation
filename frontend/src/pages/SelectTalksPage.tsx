import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { buildSlotGroups } from '../api/session'
import type { ConsultantSession } from '../api/session'
import { fetchSlotOptions } from '../api/slotOptions'
import type { SlotOption } from '../api/slotOptions'
import { fetchStudentTopics } from '../api/studentTopics'
import type { StudentTopic } from '../api/studentTopics'
import { fetchStudentSelection, saveStudentSelection, MIN_TALK_SELECTIONS, MAX_TALK_SELECTIONS } from '../api/studentSelection'
import type { StudentSelectionData } from '../api/studentSelection'
import { SessionReadOnly } from './ConsultantSessionPage'
import styles from './SelectTalksPage.module.css'
import AppTitle from '../components/AppTitle'

function TopicBrowserContent({
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
        ? <SessionReadOnly session={session} slotGroups={slotGroups} hideTag />
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

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ')

  return (
    <div className={styles.card}>
      <div className={styles.section}>
        <div className={styles.photoRow}>
          {profile.profile_picture_url
            ? <img src={profile.profile_picture_url} alt="" className={styles.avatar} />
            : <div className={styles.avatarPlaceholder}>👤</div>
          }
          <span className={styles.profileName}>{fullName}</span>
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPersonal')}</p>
        <div className={styles.row}>
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

export default function SelectTalksPage() {
  const { t } = useTranslation()
  const [dataPromise] = useState(() => Promise.all([
    fetchStudentTopics(),
    fetchStudentSelection(),
    fetchSlotOptions(),
  ]))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('dashboard.selectTalksTitle')}</h1>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
          <TopicBrowserContent dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
