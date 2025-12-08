import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard page with role-based welcome message and quick links
 */
export function DashboardPage() {
  const { t } = useTranslation();
  const { user, isTeacher } = useAuth();

  return (
    <div className="dashboard-page">
      <h2>{t('dashboard.welcome')}, {user?.displayName}!</h2>
      <p className="dashboard-role">
        {t('auth.role')}: <strong>{isTeacher ? t('auth.teacher') : t('auth.student')}</strong>
      </p>

      <div className="quick-links">
        <h3>Quick Actions</h3>
        <ul className="quick-links-list">
          <li>
            <Link to="/maps" className="quick-link">
              {t('maps.title')}
            </Link>
          </li>
          {isTeacher && (
            <>
              <li>
                <Link to="/topics" className="quick-link">
                  {t('topics.title')}
                </Link>
              </li>
              <li>
                <Link to="/comparisons" className="quick-link">
                  Comparisons
                </Link>
              </li>
              <li>
                <Link to="/students" className="quick-link">
                  {t('students.title')}
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
