import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navigation component with role-based menu items
 */
export function Navigation() {
  const { t } = useTranslation();
  const { isTeacher } = useAuth();

  return (
    <nav className="app-nav">
      <ul className="nav-list">
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            {t('nav.dashboard')}
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/maps"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {t('nav.maps')}
          </NavLink>
        </li>
        {isTeacher && (
          <>
            <li>
              <NavLink
                to="/topics"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {t('nav.topics')}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/comparisons"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Comparisons
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/students"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {t('nav.students')}
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
