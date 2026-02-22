import { Hono } from 'hono';

const app = new Hono();

app.get('/', (ctx) => ctx.text('hono-ok'));

export default app;
