import { Suspense, use, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchAdminConsultantDetail, fetchAdminTags, updateTopicTag } from '../../api/admin'
import type { AdminConsultantDetail, AdminConsultantTopic, Tag } from '../../api/admin'
import { SLOT_GROUPS } from '../../api/session'
import styles from './ConsultantDetailPage.module.css'
import AppTitle from '../../components/AppTitle'

type Tab = 'profile' | 'session'

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

function ProfileTab({ consultant }: { consultant: AdminConsultantDetail }) {
  const { t } = useTranslation()
  const p = consultant.consultant_profile

  if (!p) {
    return <p className={styles.noData}>{t('admin.consultantDetail.noProfile')}</p>
  }

  return (
    <div className={styles.card}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPhoto')}</p>
        <div className={styles.photoRow}>
          {p.profile_picture_url
            ? <img src={p.profile_picture_url} alt="" className={styles.avatar} />
            : <div className={styles.avatarPlaceholder}>👤</div>
          }
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPersonal')}</p>
        <div className={styles.row}>
          <Field label={t('profile.fieldLastName')} value={p.last_name} />
          <Field label={t('profile.fieldFirstName')} value={p.first_name} />
        </div>
        <div className={styles.row} style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldPhone')} value={p.phone} />
          <Field label={t('profile.fieldGraduationYear')} value={p.graduation_year} />
        </div>
        <div className={styles.row} style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldSerie')} value={p.serie} />
          <Field label={t('profile.fieldLinkedin')} value={p.linkedin_url} />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionCareer')}</p>
        <Field label={t('profile.fieldCareerPath')} value={p.career_path} />
        <div style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldCurrentSituation')} value={p.current_situation} />
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <Field label={t('profile.fieldWhyThisCareer')} value={p.why_this_career} />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionConsent')}</p>
        <div className={styles.consentRow}>
          <input type="checkbox" checked={p.consent_poster} readOnly className={styles.consentCheck} />
          <span className={styles.value}>{t('profile.consentPoster')}</span>
        </div>
        <div className={styles.consentRow}>
          <input type="checkbox" checked={p.consent_alumni_data} readOnly className={styles.consentCheck} />
          <span className={styles.value}>{t('profile.consentAlumniData')}</span>
        </div>
      </div>
    </div>
  )
}

function TagEditor({
  topic,
  tags,
  onTagChange,
}: {
  topic: AdminConsultantTopic
  tags: Tag[]
  onTagChange: (topic: AdminConsultantTopic) => void
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [selectedTagId, setSelectedTagId] = useState<number | ''>(topic.tag?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!selectedTagId) return
    setBusy(true)
    setError(null)
    try {
      const updated = await updateTopicTag(topic.id, selectedTagId)
      onTagChange(updated)
      setEditing(false)
    } catch {
      setError(t('admin.consultantDetail.errorTagSave'))
    } finally {
      setBusy(false)
    }
  }

  function handleCancel() {
    setSelectedTagId(topic.tag?.id ?? '')
    setError(null)
    setEditing(false)
  }

  return (
    <div className={styles.field} style={{ marginTop: '0.75rem' }}>
      <span className={styles.label}>{t('admin.columns.tag')}</span>
      {editing ? (
        <div className={styles.tagEditRow}>
          <select
            value={selectedTagId}
            onChange={e => setSelectedTagId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">—</option>
            {tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
          <button className={styles.tagSaveBtn} onClick={handleSave} disabled={busy || !selectedTagId}>
            {busy ? '…' : t('admin.consultantDetail.saveTag')}
          </button>
          <button className={styles.tagCancelBtn} onClick={handleCancel} disabled={busy}>
            {t('admin.phase.cancel')}
          </button>
        </div>
      ) : (
        <div className={styles.tagEditRow}>
          {topic.tag
            ? <span className={styles.tag}>{topic.tag.name}</span>
            : <span className={styles.valueEmpty}>—</span>
          }
          <button className={styles.tagEditBtn} onClick={() => setEditing(true)}>
            {t('admin.consultantDetail.editTag')}
          </button>
        </div>
      )}
      {error && <p className={styles.tagError}>{error}</p>}
    </div>
  )
}

function SessionTab({
  topic,
  tags,
  onTagChange,
}: {
  topic: AdminConsultantTopic | null
  tags: Tag[]
  onTagChange: (topic: AdminConsultantTopic) => void
}) {
  const { t } = useTranslation()

  if (!topic) {
    return <p className={styles.noData}>{t('admin.consultantDetail.noSession')}</p>
  }

  return (
    <div className={styles.card}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('session.sectionDetails')}</p>
        <Field label={t('session.fieldTitle')} value={topic.title} />
        <TagEditor topic={topic} tags={tags} onTagChange={onTagChange} />
        {topic.description && (
          <div style={{ marginTop: '0.75rem' }}>
            <Field label={t('session.fieldDescription')} value={topic.description} />
          </div>
        )}
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('session.sectionSlots')}</p>
        {SLOT_GROUPS.map(group => {
          const active = group.slots.filter(s => topic.selected_slots.includes(s.id))
          if (active.length === 0) return null
          return (
            <div key={group.key} className={styles.slotGroup}>
              <p className={styles.slotGroupLabel}>{group.label}</p>
              <div className={styles.slotList}>
                {active.map(slot => (
                  <span key={slot.id} className={styles.slotBadge}>{slot.time}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DetailContent({
  detailPromise,
  tagsPromise,
}: {
  detailPromise: Promise<AdminConsultantDetail>
  tagsPromise: Promise<Tag[]>
}) {
  const consultant = use(detailPromise)
  const tags = use(tagsPromise)
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [topic, setTopic] = useState<AdminConsultantTopic | null>(consultant.topics[0] ?? null)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <Link to="/admin/consultants" className={styles.backBtn}>
          {t('admin.consultantDetail.backToList')}
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{consultant.name}</h1>
        <p className={styles.subtitle}>{consultant.email ?? consultant.ldap_username ?? ''}</p>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            {t('admin.consultantDetail.tabProfile')}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'session' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('session')}
          >
            {t('admin.consultantDetail.tabSession')}
          </button>
        </div>

        {activeTab === 'profile'
          ? <ProfileTab consultant={consultant} />
          : <SessionTab topic={topic} tags={tags} onTagChange={setTopic} />
        }
      </main>
    </div>
  )
}

export default function ConsultantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detailPromise] = useState(() => fetchAdminConsultantDetail(Number(id)))
  const [tagsPromise] = useState(() => fetchAdminTags())

  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
      <DetailContent detailPromise={detailPromise} tagsPromise={tagsPromise} />
    </Suspense>
  )
}
