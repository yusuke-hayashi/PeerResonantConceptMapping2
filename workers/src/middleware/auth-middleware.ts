import type { Context, Next } from 'hono';
import { extractBearerToken, AuthError, AuthErrorCode } from '../services/auth-service';
import type { SessionInfo } from '@peer-resonant/shared';

/**
 * Context variables added by auth middleware
 */
export interface AuthVariables {
  session: SessionInfo;
}

/**
 * Error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Create error response
 */
function createErrorResponse(code: string, message: string, details?: Record<string, unknown>): ErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Validate session token (simplified implementation)
 * Note: In production, use Firebase Admin SDK for proper verification
 */
async function validateToken(
  token: string,
  getUserRole: (userId: string) => Promise<'teacher' | 'student'>
): Promise<SessionInfo> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid token format');
    }

    const payload = JSON.parse(atob(parts[1])) as {
      sub: string;
      exp: number;
    };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new AuthError(AuthErrorCode.SESSION_EXPIRED, 'Session has expired');
    }

    const role = await getUserRole(payload.sub);

    return {
      userId: payload.sub,
      role,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError(AuthErrorCode.INVALID_CREDENTIALS, 'Invalid token');
  }
}

/**
 * Authentication middleware factory
 */
export function authMiddleware(
  getUserRole: (userId: string) => Promise<'teacher' | 'student'>
) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return c.json(
        createErrorResponse(
          AuthErrorCode.UNAUTHORIZED,
          'Authentication required'
        ),
        401
      );
    }

    try {
      const session = await validateToken(token, getUserRole);
      c.set('session', session);
      await next();
    } catch (error) {
      if (error instanceof AuthError) {
        const status = error.code === AuthErrorCode.SESSION_EXPIRED ? 401 : 401;
        return c.json(
          createErrorResponse(error.code, error.message),
          status
        );
      }
      return c.json(
        createErrorResponse(AuthErrorCode.UNAUTHORIZED, 'Authentication failed'),
        401
      );
    }
  };
}

/**
 * Role-based authorization middleware
 * Property 14: Role-based feature access
 */
export function requireRole(...allowedRoles: Array<'teacher' | 'student'>) {
  return async (c: Context, next: Next) => {
    const session = c.get('session') as SessionInfo | undefined;

    if (!session) {
      return c.json(
        createErrorResponse(AuthErrorCode.UNAUTHORIZED, 'Authentication required'),
        401
      );
    }

    if (!allowedRoles.includes(session.role)) {
      return c.json(
        createErrorResponse(
          AuthErrorCode.FORBIDDEN,
          'You do not have permission to access this resource',
          { requiredRoles: allowedRoles, currentRole: session.role }
        ),
        403
      );
    }

    await next();
  };
}
