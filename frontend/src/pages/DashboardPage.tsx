import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Dashboard page with role-based welcome message and quick links
 */
export function DashboardPage() {
  const { user, isTeacher } = useAuth();

  return (
    <div className="dashboard-page">
      <h2>Welcome, {user?.displayName}!</h2>
      <p className="dashboard-role">
        You are logged in as a <strong>{isTeacher ? 'Teacher' : 'Student'}</strong>
      </p>

      <div className="quick-links">
        <h3>Quick Actions</h3>
        <ul className="quick-links-list">
          <li>
            <Link to="/maps" className="quick-link">
              View My Concept Maps
            </Link>
          </li>
          {isTeacher && (
            <>
              <li>
                <Link to="/topics" className="quick-link">
                  Manage Topics
                </Link>
              </li>
              <li>
                <Link to="/comparisons" className="quick-link">
                  Create Comparisons
                </Link>
              </li>
              <li>
                <Link to="/students" className="quick-link">
                  View Students
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
