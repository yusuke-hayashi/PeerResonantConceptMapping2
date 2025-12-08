import { useTranslation } from 'react-i18next';

/**
 * Language switcher component
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <select
      className="language-switcher"
      value={i18n.language}
      onChange={handleLanguageChange}
      aria-label={t('language.switch')}
    >
      <option value="ja">{t('language.japanese')}</option>
      <option value="en">{t('language.english')}</option>
    </select>
  );
}
