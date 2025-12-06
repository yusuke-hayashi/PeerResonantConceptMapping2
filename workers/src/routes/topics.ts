import { Hono } from 'hono';
import type { Context } from 'hono';
import type { SessionInfo, Topic } from '@peer-resonant/shared';
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
 * Request body types
 */
interface CreateTopicBody {
  name: string;
  description?: string;
}

interface UpdateTopicBody {
  name?: string;
  description?: string;
}

/**
 * Create topics router
 */
export function createTopicsRouter(firestoreService: FirestoreService) {
  const router = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

  /**
   * GET /topics - Get all topics
   */
  router.get('/', async (c: Context) => {
    const topics = await firestoreService.getAllTopics();
    return c.json({ data: topics });
  });

  /**
   * GET /topics/:id - Get a single topic
   */
  router.get('/:id', async (c: Context) => {
    const topicId = c.req.param('id');
    const topic = await firestoreService.getTopic(topicId);

    if (!topic) {
      return c.json(
        { error: { code: 'TOPIC_NOT_FOUND', message: 'Topic not found' } },
        404
      );
    }

    return c.json({ data: topic });
  });

  /**
   * POST /topics - Create a new topic (teachers only)
   */
  router.post('/', async (c: Context) => {
    const session = c.get('session') as SessionInfo;

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can create topics' } },
        403
      );
    }

    const body = await c.req.json<CreateTopicBody>();

    if (!body.name || body.name.trim().length === 0) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Topic name is required' } },
        400
      );
    }

    const topic = await firestoreService.createTopic({
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      createdBy: session.userId,
    });

    return c.json({ data: topic }, 201);
  });

  /**
   * PUT /topics/:id - Update a topic (teachers only)
   */
  router.put('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const topicId = c.req.param('id');

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can update topics' } },
        403
      );
    }

    const topic = await firestoreService.getTopic(topicId);
    if (!topic) {
      return c.json(
        { error: { code: 'TOPIC_NOT_FOUND', message: 'Topic not found' } },
        404
      );
    }

    const body = await c.req.json<UpdateTopicBody>();
    const updates: Partial<Pick<Topic, 'name' | 'description'>> = {};

    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return c.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Topic name cannot be empty' } },
          400
        );
      }
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updates.description = body.description.trim();
    }

    const updatedTopic = await firestoreService.updateTopic(topicId, updates);
    return c.json({ data: updatedTopic });
  });

  /**
   * DELETE /topics/:id - Delete a topic (teachers only)
   */
  router.delete('/:id', async (c: Context) => {
    const session = c.get('session') as SessionInfo;
    const topicId = c.req.param('id');

    if (session.role !== 'teacher') {
      return c.json(
        { error: { code: 'FORBIDDEN', message: 'Only teachers can delete topics' } },
        403
      );
    }

    const topic = await firestoreService.getTopic(topicId);
    if (!topic) {
      return c.json(
        { error: { code: 'TOPIC_NOT_FOUND', message: 'Topic not found' } },
        404
      );
    }

    await firestoreService.deleteTopic(topicId);
    return c.json({ data: { success: true } });
  });

  return router;
}
