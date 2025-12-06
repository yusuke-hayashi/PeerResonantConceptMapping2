import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware, requireRole } from './middleware/auth-middleware';
import { createMockFirestoreService, type FirestoreService } from './services/firestore-service';
import { createConceptMapService } from './services/concept-map-service';
import { createComparisonService } from './services/comparison-service';
import { createPermissionService } from './services/permission-service';
import { createMockLLMAdapter } from './services/llm-adapter';
import { createTopicsRouter } from './routes/topics';
import { createConceptMapsRouter } from './routes/concept-maps';
import { createComparisonsRouter } from './routes/comparisons';
import { createUsersRouter } from './routes/users';
import type { SessionInfo } from '@peer-resonant/shared';

/**
 * Cloudflare Workers bindings
 */
type Bindings = {
  ENVIRONMENT: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  LLM_ENDPOINT: string;
};

/**
 * Variables from middleware
 */
interface Variables {
  session: SessionInfo;
}

/**
 * Create the application with dependency injection
 */
function createApp(firestoreService: FirestoreService) {
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  // Initialize services
  const llmAdapter = createMockLLMAdapter();
  const conceptMapService = createConceptMapService(firestoreService);
  const comparisonService = createComparisonService(firestoreService, llmAdapter);
  const permissionService = createPermissionService(firestoreService);

  // CORS configuration
  app.use(
    '*',
    cors({
      origin: ['http://localhost:5173', 'https://peer-resonant-concept-mapping.pages.dev'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Public routes
  app.get('/', (c) => {
    return c.json({ message: 'Peer Resonant Concept Mapping API', version: '0.1.0' });
  });

  app.get('/health', (c) => {
    return c.json({ status: 'ok', environment: c.env?.ENVIRONMENT ?? 'test' });
  });

  // Mock user role getter for auth middleware
  // In production, this would query the database
  const getUserRole = async (userId: string): Promise<'teacher' | 'student'> => {
    const user = await firestoreService.getUser(userId);
    return user?.role ?? 'student';
  };

  // Protected API routes
  const api = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  // Apply authentication middleware to all API routes
  api.use('*', authMiddleware(getUserRole));

  // Mount routers
  api.route('/topics', createTopicsRouter(firestoreService));
  api.route('/concept-maps', createConceptMapsRouter(conceptMapService));
  api.route('/comparisons', createComparisonsRouter(comparisonService, permissionService));
  api.route('/users', createUsersRouter(firestoreService));

  // Mount API under /api/v1
  app.route('/api/v1', api);

  // Error handler
  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      500
    );
  });

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      },
      404
    );
  });

  return app;
}

// Create app with mock firestore for development
const firestoreService = createMockFirestoreService();
const app = createApp(firestoreService);

export default app;

// Export for testing
export { createApp };
