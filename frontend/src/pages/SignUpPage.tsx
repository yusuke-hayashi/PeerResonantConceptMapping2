import { useState, useEffect, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getTeachers, type User } from '../services/firestore';

type UserRole = 'teacher' | 'student';

/**
 * Sign up page component
 */
export function SignUpPage() {
  const { t } = useTranslation();
  const { user, loading, error, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [teacherId, setTeacherId] = useState('');
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load teachers when role is student
  useEffect(() => {
    async function loadTeachers() {
      if (role !== 'student') return;

      setLoadingTeachers(true);
      try {
        const teacherList = await getTeachers();
        setTeachers(teacherList);
      } catch (err) {
        console.error('Failed to load teachers:', err);
      } finally {
        setLoadingTeachers(false);
      }
    }

    loadTeachers();
  }, [role]);

  // Redirect if already logged in
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setValidationError(t('errors.passwordsDoNotMatch'));
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setValidationError(t('errors.passwordTooShort'));
      return;
    }

    // Validate teacher selection for students
    if (role === 'student' && !teacherId) {
      setValidationError(t('errors.pleaseSelectTeacher'));
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp(email, password, displayName, role, role === 'student' ? teacherId : undefined);
    } catch {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">{t('auth.createAccount')}</h1>
        <p className="login-subtitle">{t('auth.signUpToGetStarted')}</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="displayName">{t('auth.displayName')}</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.displayNamePlaceholder')}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('auth.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('auth.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">{t('auth.confirmPassword')}</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">{t('auth.role')}</label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as UserRole);
                if (e.target.value === 'teacher') {
                  setTeacherId('');
                }
              }}
              disabled={isSubmitting}
            >
              <option value="student">{t('auth.student')}</option>
              <option value="teacher">{t('auth.teacher')}</option>
            </select>
          </div>

          {role === 'student' && (
            <div className="form-group">
              <label htmlFor="teacher">{t('auth.yourTeacher')}</label>
              <select
                id="teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={isSubmitting || loadingTeachers}
                required
              >
                <option value="">
                  {loadingTeachers ? t('auth.loadingTeachers') : t('auth.selectTeacher')}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && !loadingTeachers && (
                <p className="form-hint">{t('auth.noTeachersAvailable')}</p>
              )}
            </div>
          )}

          {(validationError || error) && (
            <p className="error-message">{validationError || error}</p>
          )}

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? t('auth.creatingAccount') : t('auth.signUp')}
          </button>
        </form>

        <p className="signup-link">
          {t('auth.alreadyHaveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
