import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { resolveWorkerHandlers } from '../../src/queue/internal.js';

const executionCtx = {
  waitUntil() {
    return;
  },
  passThroughOnException() {
    return;
  },
  props: {}
} as unknown as ExecutionContext;

describe('resolveWorkerHandlers', () => {
  it('resolves fetch from a Hono default export object', async () => {
    const app = new Hono();
    app.get('/', (ctx) => ctx.text('ok'));

    const handlers = resolveWorkerHandlers({ default: app });
    const response = await handlers.fetch(new Request('http://localhost/'), {}, executionCtx);

    expect(await response.text()).toBe('ok');
  });

  it('resolves named fetch export fallback', async () => {
    const handlers = resolveWorkerHandlers({
      fetch: async () => new Response('named')
    });

    const response = await handlers.fetch(new Request('http://localhost/'), {}, executionCtx);

    expect(await response.text()).toBe('named');
  });
});
