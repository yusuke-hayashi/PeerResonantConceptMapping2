import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { Hono } from 'hono';
import { authMiddleware, requireRole } from '../middleware/auth-middleware';
import { UserRole } from '@peer-resonant/shared';

/**
 * Create a valid JWT-like token for testing
 */
function createTestToken(payload: { sub: string; exp: number }): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = btoa('test-signature');
  return `${header}.${body}.${signature}`;
}

/**
 * Create an expired token
 */
function createExpiredToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
  return createTestToken({ sub: userId, exp });
}

/**
 * Create a valid token
 */
function createValidToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  return createTestToken({ sub: userId, exp });
}

describe('Auth Middleware Property Tests', () => {
  // Feature: peer-concept-mapping, Property 14: Role-based feature access
  // For any authenticated user, the features they can access are limited based on their role (teacher or student)
  describe('Property 14: Role-based feature access', () => {
    it('should allow teachers to access teacher-only routes', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.TEACHER);

          app.use('*', authMiddleware(getUserRole));
          app.use('/teacher-only/*', requireRole(UserRole.TEACHER));
          app.get('/teacher-only/resource', (c) => c.json({ success: true }));

          const token = createValidToken(userId);
          const res = await app.request('/teacher-only/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.success).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should deny students access to teacher-only routes', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

          app.use('*', authMiddleware(getUserRole));
          app.use('/teacher-only/*', requireRole(UserRole.TEACHER));
          app.get('/teacher-only/resource', (c) => c.json({ success: true }));

          const token = createValidToken(userId);
          const res = await app.request('/teacher-only/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error.code).toBe('FORBIDDEN');
        }),
        { numRuns: 50 }
      );
    });

    it('should allow students to access student routes', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

          app.use('*', authMiddleware(getUserRole));
          app.use('/student/*', requireRole(UserRole.STUDENT, UserRole.TEACHER));
          app.get('/student/resource', (c) => c.json({ success: true }));

          const token = createValidToken(userId);
          const res = await app.request('/student/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(200);
          const body = await res.json();
          expect(body.success).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should allow teachers to access both teacher and student routes', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.TEACHER);

          app.use('*', authMiddleware(getUserRole));
          app.use('/shared/*', requireRole(UserRole.STUDENT, UserRole.TEACHER));
          app.get('/shared/resource', (c) => c.json({ success: true }));

          const token = createValidToken(userId);
          const res = await app.request('/shared/resource', {
            headers: { Authorization: `Bearer ${token}` },
          });

          expect(res.status).toBe(200);
        }),
        { numRuns: 50 }
      );
    });
  });

  // Feature: peer-concept-mapping, Property 15: Re-authentication on session expiry
  // For any expired session token, API calls using that token are rejected and re-authentication is required
  describe('Property 15: Re-authentication on session expiry', () => {
    it('should reject expired tokens with 401 status', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

          app.use('*', authMiddleware(getUserRole));
          app.get('/protected', (c) => c.json({ success: true }));

          const expiredToken = createExpiredToken(userId);
          const res = await app.request('/protected', {
            headers: { Authorization: `Bearer ${expiredToken}` },
          });

          expect(res.status).toBe(401);
          const body = await res.json();
          expect(body.error.code).toBe('SESSION_EXPIRED');
        }),
        { numRuns: 50 }
      );
    });

    it('should reject requests without authorization header', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async () => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

          app.use('*', authMiddleware(getUserRole));
          app.get('/protected', (c) => c.json({ success: true }));

          const res = await app.request('/protected');

          expect(res.status).toBe(401);
          const body = await res.json();
          expect(body.error.code).toBe('UNAUTHORIZED');
        }),
        { numRuns: 20 }
      );
    });

    it('should reject invalid token formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter((s) => !s.includes('.') || s.split('.').length !== 3),
          async (invalidToken) => {
            const app = new Hono();
            const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

            app.use('*', authMiddleware(getUserRole));
            app.get('/protected', (c) => c.json({ success: true }));

            const res = await app.request('/protected', {
              headers: { Authorization: `Bearer ${invalidToken}` },
            });

            expect(res.status).toBe(401);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid non-expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (userId) => {
          const app = new Hono();
          const getUserRole = vi.fn().mockResolvedValue(UserRole.STUDENT);

          app.use('*', authMiddleware(getUserRole));
          app.get('/protected', (c) => c.json({ success: true }));

          const validToken = createValidToken(userId);
          const res = await app.request('/protected', {
            headers: { Authorization: `Bearer ${validToken}` },
          });

          expect(res.status).toBe(200);
        }),
        { numRuns: 50 }
      );
    });
  });
});
