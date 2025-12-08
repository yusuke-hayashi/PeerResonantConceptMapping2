/**
 * User role enum
 */
export const UserRole = {
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * User data model
 * Firestore collection: users
 */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  teacherId?: string; // For students: the ID of their teacher
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authentication result
 */
export interface AuthResult {
  userId: string;
  token: string;
  role: UserRole;
}

/**
 * Session information
 */
export interface SessionInfo {
  userId: string;
  role: UserRole;
  expiresAt: Date;
}
