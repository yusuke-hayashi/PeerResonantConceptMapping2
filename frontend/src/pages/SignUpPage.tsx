import { useState, useEffect, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTeachers, type User } from '../services/firestore';

type UserRole = 'teacher' | 'student';

/**
 * Sign up page component
 */
export function SignUpPage() {
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
      setValidationError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    // Validate teacher selection for students
    if (role === 'student' && !teacherId) {
      setValidationError('Please select your teacher');
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
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">Create Account</h1>
        <p className="login-subtitle">Sign up to get started</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password (min 6 characters)"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
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
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {role === 'student' && (
            <div className="form-group">
              <label htmlFor="teacher">Your Teacher</label>
              <select
                id="teacher"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={isSubmitting || loadingTeachers}
                required
              >
                <option value="">
                  {loadingTeachers ? 'Loading teachers...' : 'Select your teacher'}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.displayName}
                  </option>
                ))}
              </select>
              {teachers.length === 0 && !loadingTeachers && (
                <p className="form-hint">No teachers available yet.</p>
              )}
            </div>
          )}

          {(validationError || error) && (
            <p className="error-message">{validationError || error}</p>
          )}

          <button type="submit" className="login-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="signup-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
