import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/durable-object/index.js';
import {
  createGeneratedQueueApi,
  createGeneratedQueueBatchApi,
  createRuntimeContext,
  getDurableObjectInternals,
  getDurableRegistrationInternals,
  getQueueConsumerInternals,
  getQueueDefinitionInternals,
  getWorkerInternals,
  normalizeKey,
  resolveWorkerHandlers,
  setGeneratedApiFactory
} from '../../src/durable-object/internal.js';

const executionCtx = {
  waitUntil() {
    return;
  },
  passThroughOnException() {
    return;
  },
  props: {}
} as unknown as ExecutionContext;

describe('durable-object internals', () => {
  it('normalizes keys and validates durable object handles', () => {
    expect(normalizeKey('general')).toBe('general');
    expect(normalizeKey(42)).toBe('42');
    expect(normalizeKey({ room: 'general' })).toBe('{"room":"general"}');

    const { defineDurableObject } = createSDK<Record<string, never>>();
    const room = defineDurableObject({
      name: 'Room',
      key: z.object({
        orgId: z.string(),
        roomId: z.string()
      })
    });

    const internals = getDurableObjectInternals<{ orgId: string; roomId: string }>(room);
    expect(internals.serializeKey({ orgId: 'o1', roomId: 'general' })).toBe('{"orgId":"o1","roomId":"general"}');

    expect(() => internals.serializeKey({ orgId: 'o1' } as never)).toThrow('Invalid durable object key for Room');
    expect(() => getDurableObjectInternals({})).toThrow('Object is not a better-cf durable object handle.');
    expect(() => getDurableObjectInternals(null)).toThrow('Value is not a durable object definition.');
  });

  it('stores function visibility and validates registration internals', () => {
    const { defineDurableObject } = createSDK<Record<string, never>>();
    const room = defineDurableObject({
      name: 'Room',
      key: z.string()
    });

    const publicFn = room.fn({
      args: z.object({ id: z.string() }),
      handler: async () => ({ ok: true })
    });

    const internalFn = room.internal({
      args: z.object({ id: z.string() }),
      handler: async () => null
    });

    expect(getDurableRegistrationInternals(publicFn)).toMatchObject({
      visibility: 'public'
    });
    expect(getDurableRegistrationInternals(internalFn)).toMatchObject({
      visibility: 'internal'
    });

    expect(() => getDurableRegistrationInternals({})).toThrow('Object is not a better-cf durable object registration.');
    expect(() => getDurableRegistrationInternals(null)).toThrow('Value is not a durable object registration.');
  });

  it('rejects inline queue handlers on the modern queue surface and exposes consumer metadata', () => {
    const { defineQueue, defineQueues } = createSDK<Record<string, never>>();

    expect(() =>
      defineQueue({
        args: z.object({ id: z.string() }),
        handler: async () => {
          return;
        }
      } as never)
    ).toThrow('Inline queue handlers are not supported in better-cf/durable-object.');

    expect(() =>
      defineQueues({
        retry: 1
      })
    ).toThrow('Multi-job queue config must define at least one job.');

    const queue = defineQueue({
      args: z.object({ id: z.string() })
    });
    const consumer = queue.message({
      handler: async () => {
        return;
      }
    });

    const queueInternals = getQueueDefinitionInternals(queue);
    expect(queueInternals.kind).toBe('single');
    queueInternals.setBinding('QUEUE_ROOM');
    expect(queueInternals.getBinding()).toBe('QUEUE_ROOM');

    expect(getQueueConsumerInternals(consumer)).toMatchObject({
      type: 'message'
    });
    expect(() => getQueueDefinitionInternals({})).toThrow('Object is not a better-cf durable-object queue handle.');
    expect(() => getQueueConsumerInternals({})).toThrow(
      'Object is not a better-cf durable-object queue consumer registration.'
    );
  });

  it('creates runtime ctx.api bindings from the generated api factory', async () => {
    const apiSpy = vi.fn(() => ({
      room: {
        sendMessage: vi.fn(async () => ({ ok: true }))
      }
    }));

    setGeneratedApiFactory(apiSpy as never);
    const env = { TOKEN: 'secret' };
    const runtime = createRuntimeContext(env, executionCtx);

    expect(runtime.env.TOKEN).toBe('secret');
    expect(apiSpy).toHaveBeenCalledWith(env, executionCtx);
    await runtime.api.room.sendMessage('general', {
      body: 'hello',
      author: 'abhi'
    });
  });

  it('converts generated queue producer options and throws when queue bindings are missing', async () => {
    const send = vi.fn(async () => {
      return;
    });
    const sendBatch = vi.fn(async () => {
      return;
    });

    await createGeneratedQueueApi({ send }, { id: '1' }, { delay: '30s', contentType: 'json' });
    expect(send).toHaveBeenCalledWith({ id: '1' }, { delaySeconds: 30, contentType: 'json' });

    await createGeneratedQueueBatchApi(
      { sendBatch },
      [
        { data: { id: '1' }, delay: '1m', contentType: 'bytes' },
        { data: { id: '2' } }
      ]
    );
    expect(sendBatch).toHaveBeenCalledWith([
      { body: { id: '1' }, delaySeconds: 60, contentType: 'bytes' },
      { body: { id: '2' } }
    ]);

    expect(() => createGeneratedQueueApi(undefined, { id: '1' })).toThrow('Queue binding is not available in env.');
    expect(() => createGeneratedQueueBatchApi(undefined, [{ data: { id: '1' } }])).toThrow(
      'Queue binding is not available in env.'
    );
  });

  it('resolves worker handlers for defineWorker entrypoints and throws when fetch is missing', async () => {
    const { defineWorker } = createSDK<Record<string, never>>();
    const entry = defineWorker({
      async fetch(_request, ctx) {
        return new Response(typeof ctx.api === 'object' ? 'ok' : 'missing');
      },
      async scheduled() {
        return;
      }
    });

    const workerInternals = getWorkerInternals(entry);
    expect(workerInternals).toBeDefined();

    setGeneratedApiFactory(() => ({ marker: true } as never));

    const handlers = resolveWorkerHandlers({ default: entry });
    const response = await handlers.fetch(new Request('https://example.com'), {}, executionCtx);
    expect(await response.text()).toBe('ok');

    await expect(handlers.scheduled?.({ cron: '* * * * *' } as never, {}, executionCtx)).resolves.toBeUndefined();
    expect(() => resolveWorkerHandlers({ default: {} })).toThrow('Could not resolve worker fetch handler.');
  });
});
