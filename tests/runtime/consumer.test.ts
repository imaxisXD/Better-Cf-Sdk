import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { testQueue } from '../../src/testing/index.js';

describe('consumer behavior', () => {
  it('acks valid messages and retries invalid payloads', async () => {
    const handler = vi.fn(async () => undefined);

    const { defineQueue } = createSDK<Record<string, unknown>>();
    const queue = defineQueue({
      args: z.object({ id: z.string() }),
      handler
    });

    const ok = await testQueue(queue, {
      env: {},
      message: { id: '123' }
    });

    expect(ok.acked).toHaveLength(1);
    expect(ok.retried).toHaveLength(0);

    const bad = await testQueue(queue, {
      env: {},
      message: { id: 123 } as unknown as { id: string }
    });

    expect(bad.acked).toHaveLength(0);
    expect(bad.retried).toHaveLength(1);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports batchHandler fallback ack behavior', async () => {
    const { defineQueue } = createSDK<Record<string, unknown>>();
    const queue = defineQueue({
      args: z.object({ id: z.string() }),
      async batchHandler() {
        return;
      }
    });

    const result = await testQueue(queue, {
      env: {},
      messages: [{ id: '1' }, { id: '2' }]
    });

    expect(result.acked).toHaveLength(2);
    expect(result.retried).toHaveLength(0);
  });

  it('supports batchHandler explicit retryAll without auto-ack', async () => {
    const { defineQueue } = createSDK<Record<string, unknown>>();

    const queue = defineQueue({
      args: z.object({ id: z.string() }),
      async batchHandler(ctx) {
        ctx.batch.retryAll();
      }
    });

    const result = await testQueue(queue, {
      env: {},
      messages: [{ id: '1' }, { id: '2' }]
    });

    expect(result.acked).toHaveLength(0);
    expect(result.retried).toHaveLength(2);
  });

  it('routes multi-job payloads and retries unknown jobs', async () => {
    const signup = vi.fn(async () => undefined);

    const { defineQueues } = createSDK<Record<string, unknown>>();
    const queue = defineQueues({
      signup: {
        args: z.object({ email: z.string() }),
        handler: signup
      },
      retryDelay: '5s'
    });

    const valid = await testQueue(queue, {
      env: {},
      message: { _job: 'signup', data: { email: 'a@b.com' } } as never
    });

    expect(valid.acked).toHaveLength(1);
    expect(valid.retried).toHaveLength(0);

    const unknown = await testQueue(queue, {
      env: {},
      message: { _job: 'missing', data: { value: true } } as never
    });

    expect(unknown.acked).toHaveLength(1);
    expect(unknown.retried).toHaveLength(0);
    expect(signup).toHaveBeenCalledTimes(1);
  });

  it('acks worker batch when queue is configured as http_pull', async () => {
    const { defineQueue } = createSDK<Record<string, unknown>>();
    const queue = defineQueue({
      args: z.object({ id: z.string() }),
      consumer: {
        type: 'http_pull'
      }
    });

    const result = await testQueue(queue, {
      env: {},
      messages: [{ id: '1' }, { id: '2' }]
    });

    expect(result.acked).toHaveLength(2);
    expect(result.retried).toHaveLength(0);
  });
});
