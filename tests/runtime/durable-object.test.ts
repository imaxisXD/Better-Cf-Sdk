import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/durable-object/index.js';
import {
  invokeDurableAlarm,
  invokeDurableFetch,
  invokeDurableInit,
  invokeDurableWebSocketClose,
  invokeDurableWebSocketConnect,
  invokeDurableWebSocketError,
  invokeDurableWebSocketMessage,
  setGeneratedApiFactory
} from '../../src/durable-object/internal.js';
import { testDurableFunction, testQueueConsumer } from '../../src/testing/index.js';

class FakeWebSocket {
  readonly sent: unknown[] = [];
  private attachment: unknown;

  send(value: unknown): void {
    this.sent.push(value);
  }

  serializeAttachment(value: unknown): void {
    this.attachment = value;
  }

  deserializeAttachment(): unknown {
    return this.attachment;
  }
}

class FakeWebSocketPair {
  0: FakeWebSocket;
  1: FakeWebSocket;

  constructor() {
    this[0] = new FakeWebSocket();
    this[1] = new FakeWebSocket();
  }
}

afterEach(() => {
  setGeneratedApiFactory(() => ({} as never));
  delete (globalThis as Record<string, unknown>).WebSocketPair;
});

describe('durable-object runtime helpers', () => {
  it('runs durable functions with validation, storage access, and return parsing', async () => {
    const { defineDurableObject } = createSDK<Record<string, never>>();
    const room = defineDurableObject({
      name: 'Room',
      key: z.string()
    });

    const sendMessage = room.fn({
      args: z.object({
        body: z.string(),
        author: z.string()
      }),
      returns: z.object({
        count: z.number()
      }),
      handler: async ({ storage }, args) => {
        const messages = ((await storage.get('messages')) as Array<{ body: string; author: string }> | undefined) ?? [];
        messages.push(args);
        await storage.put('messages', messages);
        return { count: messages.length };
      }
    });

    const storage = new Map<string, unknown>();
    const result = await testDurableFunction(sendMessage, {
      env: {},
      storage,
      args: {
        body: 'hello',
        author: 'abhi'
      }
    });

    expect(result).toEqual({ count: 1 });
    expect(storage.get('messages')).toEqual([{ body: 'hello', author: 'abhi' }]);
  });

  it('binds ctx.api inside external queue consumers and dispatches batch consumers', async () => {
    const { defineQueue } = createSDK<Record<string, never>>();
    const emailQueue = defineQueue({
      args: z.object({
        roomId: z.string(),
        body: z.string(),
        to: z.string().email()
      })
    });

    const sendMessage = vi.fn(async () => ({ ok: true }));
    const messageConsumer = emailQueue.message({
      handler: async (ctx, job) => {
        await ctx.api.room.sendMessage(job.roomId, {
          body: job.body,
          author: 'system'
        });
      }
    });

    const messageResult = await testQueueConsumer(emailQueue, messageConsumer, {
      env: {},
      api: {
        room: {
          sendMessage
        }
      },
      message: {
        roomId: 'general',
        body: 'hello',
        to: 'team@example.com'
      }
    });

    expect(sendMessage).toHaveBeenCalledWith('general', {
      body: 'hello',
      author: 'system'
    });
    expect(messageResult.acked).toHaveLength(1);

    const seenBatches: Array<Array<{ roomId: string; body: string; to: string }>> = [];
    const batchConsumer = emailQueue.batch({
      handler: async (_ctx, jobs) => {
        seenBatches.push(jobs.map((job) => job.data));
      }
    });

    const batchResult = await testQueueConsumer(emailQueue, batchConsumer, {
      env: {},
      messages: [
        { roomId: 'general', body: 'a', to: 'a@example.com' },
        { roomId: 'general', body: 'b', to: 'b@example.com' }
      ]
    });

    expect(seenBatches).toEqual([
      [
        { roomId: 'general', body: 'a', to: 'a@example.com' },
        { roomId: 'general', body: 'b', to: 'b@example.com' }
      ]
    ]);
    expect(batchResult.acked).toHaveLength(2);
  });

  it('calls external queue failure hooks when validation fails', async () => {
    const { defineQueue } = createSDK<Record<string, never>>();
    const queue = defineQueue({
      args: z.object({
        id: z.string()
      }),
      retryDelay: '30s'
    });

    const failure = vi.fn(async () => {
      return;
    });
    const consumer = queue.message({
      handler: async () => {
        return;
      },
      failure
    });

    const result = await testQueueConsumer(queue, consumer, {
      env: {},
      message: { id: 123 } as never
    });

    expect(failure).toHaveBeenCalledTimes(1);
    expect(result.acked).toHaveLength(0);
    expect(result.retried).toHaveLength(1);
  });

  it('invokes fetch, alarm, init, and websocket durable hooks', async () => {
    const { defineDurableObject } = createSDK<Record<string, never>>();
    const room = defineDurableObject({
      name: 'Room',
      key: z.string()
    });

    const init = room.init({
      handler: async ({ storage }) => {
        await storage.put('booted', true);
      }
    });

    const fetchHook = room.fetch({
      handler: async ({ request }) => new Response(new URL(request.url).pathname)
    });

    const alarmSpy = vi.fn(async (_alarmInfo: AlarmInvocationInfo) => {
      return;
    });
    const alarm = room.alarm({
      handler: async (ctx) => {
        await alarmSpy(ctx.alarmInfo);
      }
    });

    const socketEvents: Array<unknown> = [];
    const websocket = room.websocket<{ roomId: string }>({
      connect: async ({ accept }) => {
        accept({ tags: ['room'], attachment: { roomId: 'general' } });
        return new Response('accepted');
      },
      message: async ({ attachment }, message) => {
        socketEvents.push({ type: 'message', attachment, message });
      },
      close: async ({ attachment }, code, reason, wasClean) => {
        socketEvents.push({ type: 'close', attachment, code, reason, wasClean });
      },
      error: async ({ attachment }, error) => {
        socketEvents.push({ type: 'error', attachment, error });
      }
    });

    const state = createDurableState();
    const executionCtx = createExecutionContext();
    (globalThis as Record<string, unknown>).WebSocketPair = FakeWebSocketPair as unknown as typeof WebSocketPair;

    await invokeDurableInit({}, state.state, executionCtx, init);
    expect(await state.state.storage.get('booted')).toBe(true);

    const fetchResponse = await invokeDurableFetch(
      {},
      state.state,
      executionCtx,
      fetchHook,
      new Request('https://example.com/room/general')
    );
    expect(await fetchResponse.text()).toBe('/room/general');

    await invokeDurableAlarm({}, state.state, executionCtx, alarm, { retryCount: 1, isRetry: false } as AlarmInvocationInfo);
    expect(alarmSpy).toHaveBeenCalledTimes(1);

    const connectResponse = await invokeDurableWebSocketConnect(
      {},
      state.state,
      executionCtx,
      websocket,
      new Request('https://example.com/socket', {
        headers: { upgrade: 'websocket' }
      })
    );
    expect(await connectResponse.text()).toBe('accepted');
    expect(state.acceptedTags).toEqual(['room']);

    const acceptedSocket = state.acceptedSocket as unknown as WebSocket;
    await invokeDurableWebSocketMessage({}, state.state, executionCtx, websocket, acceptedSocket, 'hello');
    await invokeDurableWebSocketClose({}, state.state, executionCtx, websocket, acceptedSocket, 1000, 'done', true);
    await invokeDurableWebSocketError({}, state.state, executionCtx, websocket, acceptedSocket, new Error('boom'));

    expect(socketEvents).toEqual([
      { type: 'message', attachment: { roomId: 'general' }, message: 'hello' },
      { type: 'close', attachment: { roomId: 'general' }, code: 1000, reason: 'done', wasClean: true },
      { type: 'error', attachment: { roomId: 'general' }, error: new Error('boom') }
    ]);
  });
});

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil() {
      return;
    },
    passThroughOnException() {
      return;
    },
    props: {}
  } as unknown as ExecutionContext;
}

function createDurableState(storageMap = new Map<string, unknown>()) {
  let acceptedSocket: unknown;
  let acceptedTags: string[] | undefined;

  const storage = {
    sql: {
      exec() {
        return {
          one() {
            return undefined;
          },
          toArray() {
            return [];
          },
          raw() {
            return [];
          }
        };
      }
    },
    async get(key: string) {
      return storageMap.get(key);
    },
    async put(key: string, value: unknown) {
      storageMap.set(key, value);
    }
  } as unknown as DurableObjectStorage;

  const state = {
    storage,
    blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
      return callback();
    },
    waitUntil() {
      return;
    },
    acceptWebSocket(socket: unknown, tags?: string[]) {
      acceptedSocket = socket;
      acceptedTags = tags;
    },
    getWebSockets() {
      return acceptedSocket ? [acceptedSocket] : [];
    }
  } as unknown as DurableObjectState;

  return {
    state,
    get acceptedSocket() {
      return acceptedSocket;
    },
    get acceptedTags() {
      return acceptedTags;
    }
  };
}
