import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchConsultantSession,
  updateConsultantSession,
  SLOT_GROUPS,
} from '../api/session'
import type { ConsultantSession, SlotId } from '../api/session'
import styles from './ConsultantSessionPage.module.css'
import AppTitle from '../components/AppTitle'

function SessionForm({ initial }: { initial: ConsultantSession | null }) {
  const { t } = useTranslation()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [selectedSlots, setSelectedSlots] = useState<Set<SlotId>>(
    new Set(initial?.selected_slots ?? [])
  )
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleSlot(id: SlotId) {
    setSelectedSlots(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedSlots.size === 0) {
      setError(t('session.errorNoSlots'))
      return
    }
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      await updateConsultantSession({
        title,
        description: description || null,
        selected_slots: Array.from(selectedSlots),
      })
      setSuccess(true)
    } catch {
      setError(t('session.errorSave'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('session.sectionDetails')}</p>
        <div className={styles.field}>
          <label htmlFor="session-title">{t('session.fieldTitle')}</label>
          <input
            id="session-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="session-desc">{t('session.fieldDescription')}</label>
          <textarea
            id="session-desc"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('session.sectionSlots')}</p>
        <p className={styles.sectionHint}>{t('session.sectionSlotsHint')}</p>
        {SLOT_GROUPS.map(group => (
          <div key={group.key} className={styles.slotGroup}>
            <p className={styles.slotGroupLabel}>{group.label}</p>
            <div className={styles.slotList}>
              {group.slots.map(slot => (
                <label key={slot.id} className={styles.slotCheckbox}>
                  <input
                    type="checkbox"
                    checked={selectedSlots.has(slot.id)}
                    onChange={() => toggleSlot(slot.id)}
                  />
                  {slot.time}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.saveBtn} disabled={busy}>
          {busy ? t('session.saving') : t('session.save')}
        </button>
        {success && <span className={styles.successMsg}>{t('session.saved')}</span>}
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>
    </form>
  )
}

function SessionPageContent({ sessionPromise }: { sessionPromise: Promise<ConsultantSession | null> }) {
  const initial = use(sessionPromise)
  const { t } = useTranslation()
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <AppTitle className={styles.appName} />
        <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('session.title')}</h1>
        <SessionForm initial={initial} />
      </main>
    </div>
  )
}

export default function ConsultantSessionPage() {
  const [sessionPromise] = useState(fetchConsultantSession)
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
      <SessionPageContent sessionPromise={sessionPromise} />
    </Suspense>
  )
}
