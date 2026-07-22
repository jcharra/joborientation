import { useTranslation } from 'react-i18next'
import { useEventTitle } from '../contexts/EventTitleContext'

export default function AppTitle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const { eventTitle } = useEventTitle()
  const lang = i18n.language.slice(0, 2) as 'en' | 'de' | 'fr'
  const label = eventTitle ? (eventTitle[lang] ?? eventTitle.en) : t('dashboard.appName')

  return <span className={className}>{label}</span>
}
