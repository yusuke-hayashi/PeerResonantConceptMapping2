import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Header component with user info and logout button
 */
export function Header() {
  const { t } = useTranslation();
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
        <LanguageSwitcher />
        {user && (
          <>
            <span className="user-info">
              {user.displayName}
              <span className="user-role">({isTeacher ? t('auth.teacher') : t('auth.student')})</span>
            </span>
            <button onClick={handleLogout} className="logout-button">
              {t('auth.logout')}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
