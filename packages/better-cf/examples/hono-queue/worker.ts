import { Hono } from 'hono';

const app = new Hono();
app.get('/', (ctx) => ctx.text('hono-queue'));

export default app;
