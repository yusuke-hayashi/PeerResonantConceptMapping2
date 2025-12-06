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
