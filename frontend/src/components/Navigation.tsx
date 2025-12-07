import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Navigation component with role-based menu items
 */
export function Navigation() {
  const { isTeacher } = useAuth();

  return (
    <nav className="app-nav">
      <ul className="nav-list">
        <li>
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/maps"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            My Maps
          </NavLink>
        </li>
        {isTeacher && (
          <>
            <li>
              <NavLink
                to="/topics"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Topics
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
                Students
              </NavLink>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
}
