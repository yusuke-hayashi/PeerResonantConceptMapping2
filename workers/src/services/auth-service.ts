import type { UserRole, AuthResult, SessionInfo } from '@peer-resonant/shared';

/**
 * Authentication error codes
 */
export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const;

export type AuthErrorCode = (typeof AuthErrorCode)[keyof typeof AuthErrorCode];

/**
 * Authentication error
 */
export class AuthError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * AuthService interface
 */
export interface AuthService {
  signIn(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  getUserRole(userId: string): Promise<UserRole>;
  validateSession(token: string): Promise<SessionInfo>;
}

/**
 * Token payload for JWT verification
 */
interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  exp: number;
  iat: number;
}

/**
 * Decode Firebase ID token (basic implementation)
 * Note: In production, use Firebase Admin SDK for proper verification
 */
function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1])) as TokenPayload;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(payload: TokenPayload): boolean {
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Firebase Auth Service implementation for Cloudflare Workers
 *
 * Note: This is a simplified implementation. In production:
 * - Use Firebase Admin SDK with proper service account
 * - Implement proper JWT verification with Firebase public keys
 */
export function createAuthService(
  _projectId: string,
  _getUserRoleFromDb: (userId: string) => Promise<UserRole>
): AuthService {
  return {
    async signIn(_email: string, _password: string): Promise<AuthResult> {
      // フロントエンドでFirebase AuthのsignInWithEmailAndPasswordを使用
      // バックエンドではトークン検証のみを行う
      throw new AuthError(
        AuthErrorCode.UNAUTHORIZED,
        'Sign in should be performed on the client side using Firebase Auth SDK'
      );
    },

    async signOut(): Promise<void> {
      // フロントエンドでFirebase AuthのsignOutを使用
      // バックエンドでは特に処理不要
    },

    async getUserRole(userId: string): Promise<UserRole> {
      return _getUserRoleFromDb(userId);
    },

    async validateSession(token: string): Promise<SessionInfo> {
      const payload = decodeToken(token);

      if (!payload) {
        throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid token format');
      }

      if (isTokenExpired(payload)) {
        throw new AuthError(AuthErrorCode.SESSION_EXPIRED, 'Session has expired');
      }

      const role = await _getUserRoleFromDb(payload.sub);

      return {
        userId: payload.sub,
        role,
        expiresAt: new Date(payload.exp * 1000),
      };
    },
  };
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}
