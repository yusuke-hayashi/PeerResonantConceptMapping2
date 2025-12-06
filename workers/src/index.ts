import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  ENVIRONMENT: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  LLM_ENDPOINT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors({
  origin: ['http://localhost:5173', 'https://peer-resonant-concept-mapping.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (c) => {
  return c.json({ message: 'Peer Resonant Concept Mapping API', version: '0.0.1' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', environment: c.env.ENVIRONMENT });
});

export default app;
