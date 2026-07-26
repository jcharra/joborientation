import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEventTitle } from '../contexts/EventTitleContext'

export default function AppTitle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const { eventTitle, eventLogoUrl } = useEventTitle()
  const lang = i18n.language.slice(0, 2) as 'de' | 'fr'
  const label = eventTitle ? (eventTitle[lang] ?? eventTitle.de) : t('dashboard.appName')

  return (
    <Link to="/dashboard" className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      {eventLogoUrl && <img src={eventLogoUrl} alt="" style={{ height: '1.75em', width: 'auto', borderRadius: '4px' }} />}
      {label}
    </Link>
  )
}
