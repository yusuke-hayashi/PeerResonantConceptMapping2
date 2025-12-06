import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * User role type
 */
type UserRole = 'teacher' | 'student';

/**
 * User information
 */
interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
}

/**
 * Auth context state
 */
interface AuthContextState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextState | undefined>(undefined);

/**
 * Fetch user role from Firestore
 */
async function fetchUserRole(userId: string): Promise<UserRole> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    const data = userDoc.data();
    return data.role as UserRole;
  }
  // デフォルトは学生
  return 'student';
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const role = await fetchUserRole(firebaseUser.uid);
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email ?? '',
            role,
            displayName: firebaseUser.displayName ?? firebaseUser.email ?? '',
          });
        } catch (err) {
          console.error('Failed to fetch user role:', err);
          setError('Failed to load user data');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    }
  };

  const value: AuthContextState = {
    user,
    loading,
    error,
    signIn,
    signOut,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
