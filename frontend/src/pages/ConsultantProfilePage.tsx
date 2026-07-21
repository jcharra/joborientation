import { Suspense, use, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchConsultantProfile,
  updateConsultantProfile,
  SERIE_OPTIONS,
} from '../api/profile'
import type { ConsultantProfileResponse, ConsultantProfileData, Serie } from '../api/profile'
import styles from './ConsultantProfilePage.module.css'

function ProfileForm({ initial }: { initial: ConsultantProfileResponse }) {
  const { t } = useTranslation()
  const p = initial.profile

  const [firstName, setFirstName] = useState(p?.first_name ?? '')
  const [lastName, setLastName] = useState(p?.last_name ?? '')
  const [phone, setPhone] = useState(p?.phone ?? '')
  const [graduationYear, setGraduationYear] = useState(p?.graduation_year?.toString() ?? '')
  const [serie, setSerie] = useState<Serie | ''>(p?.serie ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(p?.linkedin_url ?? '')
  const [careerPath, setCareerPath] = useState(p?.career_path ?? '')
  const [currentSituation, setCurrentSituation] = useState(p?.current_situation ?? '')
  const [whyThisCareer, setWhyThisCareer] = useState(p?.why_this_career ?? '')
  const [consentPoster, setConsentPoster] = useState(p?.consent_poster ?? false)
  const [consentAlumniData, setConsentAlumniData] = useState(p?.consent_alumni_data ?? false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(p?.profile_picture_url ?? null)

  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    if (file) setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSuccess(false)
    setError(null)
    try {
      const fields: Partial<Omit<ConsultantProfileData, 'id' | 'profile_picture_path' | 'profile_picture_url'>> = {
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        serie: (serie as Serie) || null,
        linkedin_url: linkedinUrl || null,
        career_path: careerPath || null,
        current_situation: currentSituation || null,
        why_this_career: whyThisCareer || null,
        consent_poster: consentPoster,
        consent_alumni_data: consentAlumniData,
      }
      await updateConsultantProfile(fields, photo ?? undefined)
      setSuccess(true)
      setPhoto(null)
    } catch {
      setError(t('profile.errorSave'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.card}>
      {/* Photo */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPhoto')}</p>
        <div className={styles.photoSection}>
          {photoPreview
            ? <img src={photoPreview} alt="" className={styles.avatar} />
            : <div className={styles.avatarPlaceholder}>👤</div>
          }
          <div className={styles.photoInput}>
            <label htmlFor="photo-input">{t('profile.fieldProfilePicture')}</label>
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionPersonal')}</p>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="last-name">{t('profile.fieldLastName')}</label>
            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="first-name">{t('profile.fieldFirstName')}</label>
            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="phone">{t('profile.fieldPhone')}</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="graduation-year">{t('profile.fieldGraduationYear')}</label>
            <input
              id="graduation-year"
              type="number"
              min={1990}
              max={2050}
              value={graduationYear}
              onChange={e => setGraduationYear(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="serie">{t('profile.fieldSerie')}</label>
            <select id="serie" value={serie} onChange={e => setSerie(e.target.value as Serie | '')}>
              <option value="">—</option>
              {SERIE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="linkedin">{t('profile.fieldLinkedin')}</label>
            <input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={e => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/…"
            />
          </div>
        </div>
      </div>

      {/* Career */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionCareer')}</p>
        <div className={styles.field}>
          <label htmlFor="career-path">{t('profile.fieldCareerPath')}</label>
          <textarea
            id="career-path"
            value={careerPath}
            onChange={e => setCareerPath(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="current-situation">{t('profile.fieldCurrentSituation')}</label>
          <textarea
            id="current-situation"
            value={currentSituation}
            onChange={e => setCurrentSituation(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="why-this-career">{t('profile.fieldWhyThisCareer')}</label>
          <textarea
            id="why-this-career"
            value={whyThisCareer}
            onChange={e => setWhyThisCareer(e.target.value)}
          />
        </div>
      </div>

      {/* Consent */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>{t('profile.sectionConsent')}</p>
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={consentPoster}
            onChange={e => setConsentPoster(e.target.checked)}
          />
          <span>{t('profile.consentPoster')}</span>
        </label>
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={consentAlumniData}
            onChange={e => setConsentAlumniData(e.target.checked)}
          />
          <span>{t('profile.consentAlumniData')}</span>
        </label>
      </div>

      <div className={styles.footer}>
        <button type="submit" className={styles.saveBtn} disabled={busy}>
          {busy ? t('profile.saving') : t('profile.save')}
        </button>
        {success && <span className={styles.successMsg}>{t('profile.saved')}</span>}
        {error && <span className={styles.errorMsg}>{error}</span>}
      </div>
    </form>
  )
}

function ProfilePageContent({ profilePromise }: { profilePromise: Promise<ConsultantProfileResponse> }) {
  const initial = use(profilePromise)
  const { t } = useTranslation()
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.appName}>{t('dashboard.appName')}</span>
        <Link to="/dashboard" className={styles.backBtn}>{t('admin.backToDashboard')}</Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>{t('profile.title')}</h1>
        <ProfileForm initial={initial} />
      </main>
    </div>
  )
}

export default function ConsultantProfilePage() {
  const [profilePromise] = useState(fetchConsultantProfile)
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>…</div>}>
      <ProfilePageContent profilePromise={profilePromise} />
    </Suspense>
  )
}
