import { Hono } from 'hono';
import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { SessionInfo, ComparisonMode } from '@peer-resonant/shared';
import type { ComparisonService } from '../services/comparison-service';
import type { PermissionService } from '../services/permission-service';
import { ComparisonError } from '../services/comparison-service';
import { PermissionError } from '../services/permission-service';

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
 * Request body types
 */
interface CreateComparisonBody {
  topicId: string;
  mode: ComparisonMode;
  mapId1?: string;
  mapId2?: string;
  referenceMapId?: string;
  studentMapIds?: string[];
}

interface GrantPermissionBody {
  studentIds: string[];
}

interface RevokePermissionBody {
  studentIds: string[];
}

/**
 * Map error to HTTP status code
 */
function mapErrorToStatus(error: ComparisonError | PermissionError): StatusCode {
  if (error instanceof ComparisonError) {
    switch (error.code) {
      case 'MAP_NOT_FOUND':
        return 404;
      case 'PERMISSION_DENIED':
        return 403;
      case 'TOPIC_MISMATCH':
      case 'NO_MAPS_SELECTED':
      case 'INVALID_MODE':
        return 400;
      case 'LLM_ERROR':
        return 503;
      default:
        return 500;
    }
  }

  if (error instanceof PermissionError) {
    switch (error.code) {
      case 'COMPARISON_NOT_FOUND':
      case 'PERMISSION_NOT_FOUND':
        return 404;
      case 'PERMISSION_DENIED':
        return 403;
      case 'INVALID_STUDENT':
        return 400;
      default:
        return 500;
    }
  }

  return 500;
}

/**
 * Create comparisons router
 */
export function createComparisonsRouter(
  comparisonService: ComparisonService,
  permissionService: PermissionService
) {
  const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

  /**
   * Error handler wrapper
   */
  async function handleRequest<T>(
    c: Context,
    handler: () => Promise<T>
  ): Promise<Response> {
    try {
      const result = await handler();
      return c.json({ data: result });
    } catch (error) {
      if (error instanceof ComparisonError || error instanceof PermissionError) {
        return c.json(
          { error: { code: error.code, message: error.message, details: error.details } },
          mapErrorToStatus(error)
        );
      }
      console.error('Unexpected error:', error);
      return c.json(
        { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
        500
      );
    }
  }

  /**
   * GET /comparisons - Get accessible comparisons for current user
   */
  router.get('/', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const topicId = c.req.query('topicId');

    return handleRequest(c, async () => {
      if (topicId) {
        return comparisonService.getComparisonsByTopic(topicId, session.userId);
      }
      return comparisonService.getAccessibleComparisons(session.userId);
    });
  });

  /**
   * GET /comparisons/:id - Get a single comparison
   */
  router.get('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const comparisonId = c.req.param('id');

    return handleRequest(c, async () => {
      return comparisonService.getComparison(comparisonId, session.userId);
    });
  });

  /**
   * POST /comparisons - Create a new comparison (teachers only)
   */
  router.post('/', async (c: Context) => {
    const session = c.get('session') as SessionInfo;

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can create comparisons' } },
        403
      );
    }

    const body = await c.req.json<CreateComparisonBody>();

    return handleRequest(c, async () => {
      switch (body.mode) {
        case 'one_to_one':
          if (!body.mapId1 || !body.mapId2) {
            throw new ComparisonError(
              'NO_MAPS_SELECTED',
              'Both mapId1 and mapId2 are required for one-to-one comparison'
            );
          }
          return comparisonService.createOneToOneComparison(
            session.userId,
            body.topicId,
            body.mapId1,
            body.mapId2
          );

        case 'teacher_to_all':
          if (!body.referenceMapId) {
            throw new ComparisonError(
              'NO_MAPS_SELECTED',
              'referenceMapId is required for teacher-to-all comparison'
            );
          }
          return comparisonService.createTeacherToAllComparison(
            session.userId,
            body.topicId,
            body.referenceMapId
          );

        case 'all_students':
          return comparisonService.createAllStudentsComparison(session.userId, body.topicId);

        case 'partial_students':
          if (!body.studentMapIds || body.studentMapIds.length < 2) {
            throw new ComparisonError(
              'NO_MAPS_SELECTED',
              'At least 2 studentMapIds are required for partial-students comparison'
            );
          }
          return comparisonService.createPartialStudentsComparison(
            session.userId,
            body.topicId,
            body.studentMapIds
          );

        default:
          throw new ComparisonError('INVALID_MODE', `Invalid comparison mode: ${body.mode}`);
      }
    });
  });

  /**
   * GET /comparisons/:id/permissions - Get permissions for a comparison
   */
  router.get('/:id/permissions', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const comparisonId = c.req.param('id');

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can view permissions' } },
        403
      );
    }

    return handleRequest(c, async () => {
      return permissionService.getPermissionsForComparison(comparisonId);
    });
  });

  /**
   * POST /comparisons/:id/permissions - Grant view permission to students
   */
  router.post('/:id/permissions', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const comparisonId = c.req.param('id');

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can grant permissions' } },
        403
      );
    }

    const body = await c.req.json<GrantPermissionBody>();

    if (!body.studentIds || body.studentIds.length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'studentIds array is required' } },
        400
      );
    }

    return handleRequest(c, async () => {
      const results = [];
      for (const studentId of body.studentIds) {
        const permission = await permissionService.grantViewPermission(
          comparisonId,
          studentId,
          session.userId
        );
        results.push(permission);
      }
      return results;
    });
  });

  /**
   * DELETE /comparisons/:id/permissions - Revoke view permission from students
   */
  router.delete('/:id/permissions', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const comparisonId = c.req.param('id');

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can revoke permissions' } },
        403
      );
    }

    const body = await c.req.json<RevokePermissionBody>();

    if (!body.studentIds || body.studentIds.length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'studentIds array is required' } },
        400
      );
    }

    return handleRequest(c, async () => {
      for (const studentId of body.studentIds) {
        await permissionService.revokeViewPermission(comparisonId, studentId, session.userId);
      }
      return { success: true };
    });
  });

  return router;
}
