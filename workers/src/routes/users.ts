import { Hono } from 'hono';
import type { Context } from 'hono';
import type { SessionInfo } from '@peer-resonant/shared';
import type { FirestoreService } from '../services/firestore-service';

/**
 * Variables from auth middleware
 */
interface AuthVariables {
  session: SessionInfo;
}

/**
 * Application bindings
 */
interface Bindings {
  ENVIRONMENT: string;
}

/**
 * Create users router
 */
export function createUsersRouter(firestoreService: FirestoreService) {
  const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

  /**
   * GET /users/me - Get current user info
   */
  router.get('/me', async (c: Context) => {
    const session = c.get('session') as SessionInfo;

    return c.json({
      data: {
        userId: session.userId,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    });
  });

  /**
   * GET /users/students - Get all students (teachers only)
   */
  router.get('/students', async (c: Context) => {
    const session = c.get('session') as SessionInfo;

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can view student list' } },
        403
      );
    }

    const students = await firestoreService.getUsersByRole('student');
    return c.json({ data: students });
  });

  /**
   * GET /users/:id/maps - Get maps for a specific user (teachers can view any, students can view their own)
   */
  router.get('/:id/maps', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const userId = c.req.param('id');

    // Students can only view their own maps
    if (session.role === 'student' && session.userId !== userId) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only view your own maps' } },
        403
      );
    }

    const maps = await firestoreService.getConceptMapsByOwner(userId);
    return c.json({ data: maps });
  });

  /**
   * GET /users/:id/comparisons - Get comparisons accessible to a specific user
   */
  router.get('/:id/comparisons', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const userId = c.req.param('id');

    // Students can only view their own comparisons
    if (session.role === 'student' && session.userId !== userId) {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'You can only view your own comparisons' } },
        403
      );
    }

    // Get comparisons created by the user
    const createdComparisons = await firestoreService.getComparisonsByCreator(userId);

    // Get comparisons the user has permission to view
    const permissions = await firestoreService.getPermissionsByStudent(userId);
    const permittedComparisons = [];

    for (const permission of permissions) {
      const comparison = await firestoreService.getComparison(permission.comparisonId);
      if (comparison) {
        permittedComparisons.push(comparison);
      }
    }

    // Combine and deduplicate
    const allComparisons = [...createdComparisons, ...permittedComparisons];
    const uniqueMap = new Map();
    for (const comparison of allComparisons) {
      uniqueMap.set(comparison.id, comparison);
    }

    return c.json({ data: Array.from(uniqueMap.values()) });
  });

  return router;
}
