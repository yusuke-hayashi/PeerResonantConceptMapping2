import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * 404 Not Found page
 */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="not-found-page">
      <h1>404</h1>
      <p>{t('errors.notFound')}</p>
      <Link to="/" className="back-link">
        {t('errors.goHome')}
      </Link>
    </div>
  );
}
