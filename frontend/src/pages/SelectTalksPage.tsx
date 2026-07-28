import { Suspense, use, useState } from 'react'
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
import TopBar from '../components/TopBar'

function AddCircleIcon() {
  return (
    <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v8M6 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function reorder(ids: number[], fromIndex: number, toIndex: number): number[] {
  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(Math.min(toIndex, next.length), 0, moved)
  return next
}

function TopicBrowserContent({
  dataPromise,
}: {
  dataPromise: Promise<[StudentTopic[], StudentSelectionData, SlotOption[]]>
}) {
  const { t } = useTranslation()
  const [topics, initialSelection, slotOptions] = use(dataPromise)
  const slotGroups = buildSlotGroups(slotOptions, t)

  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelection.topic_ids)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const topicsById = new Map(topics.map(topic => [topic.id, topic]))
  const availableTopics = topics.filter(topic => !selectedIds.includes(topic.id))

  function selectTopic(topicId: number) {
    setSuccess(false)
    setSelectedIds(prev => (prev.length < MAX_TALK_SELECTIONS ? [...prev, topicId] : prev))
    setExpandedId(prev => (prev === topicId ? null : prev))
  }

  function removeTopic(topicId: number) {
    setSuccess(false)
    setSelectedIds(prev => prev.filter(id => id !== topicId))
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    setSuccess(false)
    setSelectedIds(prev => reorder(prev, dragIndex, targetIndex))
    setDragIndex(null)
  }

  const canSave = selectedIds.length >= MIN_TALK_SELECTIONS && selectedIds.length <= MAX_TALK_SELECTIONS

  async function handleSave() {
    if (!canSave) return
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await saveStudentSelection(selectedIds)
      setSuccess(true)
    } catch {
      setError(t('dashboard.selectionErrorSave'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.selectionLayout}>
      <div className={styles.column}>
        <h2 className={styles.columnTitle}>{t('dashboard.availableTalksTitle')}</h2>
        <p className={styles.columnHint}>{t('dashboard.availableTalksHint')}</p>
        <div className={styles.topicList}>
          {availableTopics.map(topic => (
            <TopicRow
              key={topic.id}
              topic={topic}
              expanded={expandedId === topic.id}
              onExpandToggle={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
              slotGroups={slotGroups}
              trailing={
                <button
                  type="button"
                  className={styles.addBtn}
                  disabled={selectedIds.length >= MAX_TALK_SELECTIONS}
                  onClick={e => { e.stopPropagation(); selectTopic(topic.id) }}
                  aria-label={t('dashboard.selectionAddAria')}
                >
                  <AddCircleIcon />
                </button>
              }
            />
          ))}
          {topics.length === 0 && <p className={styles.soonToCome}>{t('dashboard.selectionNoTopics')}</p>}
          {topics.length > 0 && availableTopics.length === 0 && (
            <p className={styles.soonToCome}>{t('dashboard.selectionAllSelected')}</p>
          )}
        </div>
      </div>

      <div className={styles.column}>
        <h2 className={styles.columnTitle}>{t('dashboard.selectedTalksTitle')}</h2>
        <p className={styles.columnHint}>{t('dashboard.selectedTalksHint')}</p>
        <div className={styles.slotList}>
          {Array.from({ length: MAX_TALK_SELECTIONS }).map((_, index) => {
            const topicId = selectedIds[index]
            const topic = topicId != null ? topicsById.get(topicId) : undefined
            return topic ? (
              <SelectedSlotRow
                key={topicId}
                index={index}
                topic={topic}
                dragging={dragIndex === index}
                expanded={expandedId === topic.id}
                onExpandToggle={() => setExpandedId(expandedId === topic.id ? null : topic.id)}
                onRemove={() => removeTopic(topic.id)}
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDrop={() => handleDrop(index)}
                slotGroups={slotGroups}
              />
            ) : (
              <div
                key={`empty-${index}`}
                className={styles.emptySlot}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(index)}
              >
                <span className={styles.slotRank}>{index + 1}</span>
                <span>{t('dashboard.selectionEmptySlot')}</span>
              </div>
            )
          })}
        </div>
        <div className={styles.footer}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={busy || !canSave}>
            {busy ? t('dashboard.selectionSaving') : t('dashboard.selectionSave')}
          </button>
        </div>
        {success && <p className={styles.successMsg}>{t('dashboard.selectionSaved')}</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}
      </div>
    </div>
  )
}

function TopicRow({
  topic,
  expanded,
  onExpandToggle,
  slotGroups,
  trailing,
}: {
  topic: StudentTopic
  expanded: boolean
  onExpandToggle: () => void
  slotGroups: ReturnType<typeof buildSlotGroups>
  trailing: React.ReactNode
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
        {trailing}
      </div>
      {expanded && <TopicDetail topic={topic} slotGroups={slotGroups} />}
    </div>
  )
}

function SelectedSlotRow({
  index,
  topic,
  dragging,
  expanded,
  onExpandToggle,
  onRemove,
  onDragStart,
  onDragEnd,
  onDrop,
  slotGroups,
}: {
  index: number
  topic: StudentTopic
  dragging: boolean
  expanded: boolean
  onExpandToggle: () => void
  onRemove: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDrop: () => void
  slotGroups: ReturnType<typeof buildSlotGroups>
}) {
  const { t } = useTranslation()
  const profile = topic.consultant.consultant_profile

  return (
    <div
      className={`${styles.topicRow} ${styles.slotRowFilled} ${dragging ? styles.slotRowDragging : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className={styles.topicRowHeader} onClick={onExpandToggle}>
        <span className={styles.dragHandle}>⋮⋮</span>
        <span className={styles.slotRank}>{index + 1}</span>
        {profile?.profile_picture_url
          ? <img src={profile.profile_picture_url} alt="" className={styles.topicRowAvatar} />
          : <div className={styles.topicRowAvatarPlaceholder}>👤</div>
        }
        <div className={styles.topicRowInfo}>
          {topic.tag && <span className={styles.tag}>{topic.tag.name}</span>}
          <span className={styles.topicRowTitle}>{topic.title}</span>
          <span className={styles.topicRowConsultant}>{topic.consultant.name}</span>
        </div>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={e => { e.stopPropagation(); onRemove() }}
          aria-label={t('dashboard.selectionRemoveAria')}
        >
          ×
        </button>
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
      <TopBar backTo="/dashboard" backLabel={t('admin.backToDashboard')} />
      <main className={styles.main}>
        <h1 className={styles.title}>{t('dashboard.selectTalksTitle')}</h1>
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
          <TopicBrowserContent dataPromise={dataPromise} />
        </Suspense>
      </main>
    </div>
  )
}
