import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

const LANGS = ['de', 'fr'] as const

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
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
