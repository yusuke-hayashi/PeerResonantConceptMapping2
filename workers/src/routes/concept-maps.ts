import { Hono } from 'hono';
import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { SessionInfo, Node, Link } from '@peer-resonant/shared';
import type { ConceptMapService } from '../services/concept-map-service';
import { ConceptMapError } from '../services/concept-map-service';

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
interface CreateMapBody {
  topicId: string;
  isReference?: boolean;
}

interface AddNodeBody {
  id: string;
  label: string;
  type: 'noun' | 'verb';
  position: {
    x: number;
    y: number;
  };
}

interface AddLinkBody {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: string;
}

interface UpdateMapBody {
  nodes?: Node[];
  links?: Link[];
}

/**
 * Map ConceptMapError to HTTP status code
 */
function mapErrorToStatus(error: ConceptMapError): StatusCode {
  switch (error.code) {
    case 'MAP_NOT_FOUND':
    case 'NODE_NOT_FOUND':
    case 'LINK_NOT_FOUND':
    case 'TOPIC_NOT_FOUND':
      return 404;
    case 'PERMISSION_DENIED':
      return 403;
    case 'TOPIC_REQUIRED':
    case 'INVALID_NODE':
    case 'INVALID_LINK':
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 500;
  }
}

/**
 * Create concept maps router
 */
export function createConceptMapsRouter(conceptMapService: ConceptMapService) {
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
      if (error instanceof ConceptMapError) {
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
   * GET /concept-maps - Get maps for current user
   */
  router.get('/', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const topicId = c.req.query('topicId');

    return handleRequest(c, async () => {
      if (topicId) {
        return conceptMapService.getMapsByTopic(topicId, session.userId, session.role);
      }
      return conceptMapService.getMapsByUser(session.userId);
    });
  });

  /**
   * GET /concept-maps/grouped - Get maps grouped by topic
   */
  router.get('/grouped', async (c: Context) => {
    const session = c.get('session') as SessionInfo;

    return handleRequest(c, async () => {
      const grouped = await conceptMapService.getMapsByTopicGrouped(session.userId);
      // Convert Map to plain object for JSON serialization
      const result: Record<string, unknown[]> = {};
      grouped.forEach((maps, topicId) => {
        result[topicId] = maps;
      });
      return result;
    });
  });

  /**
   * GET /concept-maps/:id - Get a single map
   */
  router.get('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');

    return handleRequest(c, async () => {
      // Check view permission first
      const canView = await conceptMapService.canView(mapId, session.userId, session.role);
      if (!canView) {
        throw new ConceptMapError('PERMISSION_DENIED', 'You do not have permission to view this map');
      }
      return conceptMapService.getMap(mapId, session.userId);
    });
  });

  /**
   * POST /concept-maps - Create a new map
   */
  router.post('/', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const body = await c.req.json<CreateMapBody>();

    // Only teachers can create reference maps
    const isReference = body.isReference === true && session.role === 'teacher';

    return handleRequest(c, async () => {
      const map = await conceptMapService.createMap(session.userId, body.topicId, isReference);
      return map;
    });
  });

  /**
   * PUT /concept-maps/:id - Update a map
   */
  router.put('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');
    const body = await c.req.json<UpdateMapBody>();

    return handleRequest(c, async () => {
      return conceptMapService.updateMap(mapId, session.userId, body);
    });
  });

  /**
   * POST /concept-maps/:id/nodes - Add a node to a map
   */
  router.post('/:id/nodes', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');
    const body = await c.req.json<AddNodeBody>();

    return handleRequest(c, async () => {
      return conceptMapService.addNode(mapId, session.userId, {
        id: body.id,
        label: body.label,
        type: body.type,
        position: body.position,
      });
    });
  });

  /**
   * DELETE /concept-maps/:id/nodes/:nodeId - Remove a node from a map
   */
  router.delete('/:id/nodes/:nodeId', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');
    const nodeId = c.req.param('nodeId');

    return handleRequest(c, async () => {
      return conceptMapService.removeNode(mapId, session.userId, nodeId);
    });
  });

  /**
   * POST /concept-maps/:id/links - Add a link to a map
   */
  router.post('/:id/links', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');
    const body = await c.req.json<AddLinkBody>();

    return handleRequest(c, async () => {
      return conceptMapService.addLink(mapId, session.userId, {
        id: body.id,
        sourceNodeId: body.sourceNodeId,
        targetNodeId: body.targetNodeId,
        relationship: body.relationship,
      });
    });
  });

  /**
   * DELETE /concept-maps/:id/links/:linkId - Remove a link from a map
   */
  router.delete('/:id/links/:linkId', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');
    const linkId = c.req.param('linkId');

    return handleRequest(c, async () => {
      return conceptMapService.removeLink(mapId, session.userId, linkId);
    });
  });

  /**
   * DELETE /concept-maps/:id - Delete a map
   */
  router.delete('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const mapId = c.req.param('id');

    return handleRequest(c, async () => {
      await conceptMapService.deleteMap(mapId, session.userId);
      return { success: true };
    });
  });

  return router;
}
