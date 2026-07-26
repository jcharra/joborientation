import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGS = ['de', 'fr'] as const

const FLAGS: Record<(typeof LANGS)[number], string> = {
  de: '🇩🇪',
  fr: '🇫🇷',
}

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'de'

  return (
    <div className={styles.switcher}>
      {LANGS.map((lng) => (
        <button
          key={lng}
          className={current === lng ? styles.active : styles.btn}
          onClick={() => i18n.changeLanguage(lng)}
          aria-label={t(`lang.${lng}`)}
          title={t(`lang.${lng}`)}
        >
          <span aria-hidden="true">{FLAGS[lng]}</span>
        </button>
      ))}
    </div>
  )
}
