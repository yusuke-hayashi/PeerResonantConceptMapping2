import { useAuth } from '../contexts/AuthContext';

/**
 * Header component with user info and logout button
 */
export function Header() {
  const { user, signOut, isTeacher } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="app-title">Peer Resonant Concept Mapping</h1>
      </div>
      <div className="header-right">
        {user && (
          <>
            <span className="user-info">
              {user.displayName}
              <span className="user-role">({isTeacher ? 'Teacher' : 'Student'})</span>
            </span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
