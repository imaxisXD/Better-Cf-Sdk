import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { getQueueInternals } from '../../src/queue/internal.js';

const executionCtx = {
  waitUntil() {
    return;
  },
  passThroughOnException() {
    return;
  },
  props: {}
} as unknown as ExecutionContext;

describe('failure handling', () => {
  it('calls onFailure and retries with retryDelay in single-message mode', async () => {
    const onFailure = vi.fn(async () => undefined);

    const { defineQueue } = createSDK<Record<string, never>>();
    const queue = defineQueue({
      message: z.object({ id: z.string() }),
      retryDelay: '9s',
      process: async () => {
        throw new Error('boom');
      },
      onFailure
    });

    const retry = vi.fn();
    const ack = vi.fn();

    const batch: MessageBatch<unknown> = {
      queue: 'test-queue',
      messages: [
        {
          id: 'm1',
          timestamp: new Date(),
          attempts: 1,
          body: { id: 'x' },
          ack,
          retry
        }
      ],
      ackAll: vi.fn(),
      retryAll: vi.fn()
    };

    await getQueueInternals(queue).consume(batch, {}, executionCtx);

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(ack).not.toHaveBeenCalled();
    expect(retry).toHaveBeenCalledWith({ delaySeconds: 9 });
  });

  it('calls onFailure and retries all in processBatch failure mode', async () => {
    const onFailure = vi.fn(async () => undefined);

    const { defineQueue } = createSDK<Record<string, never>>();
    const queue = defineQueue({
      message: z.object({ id: z.string() }),
      retryDelay: '7s',
      processBatch: async () => {
        throw new Error('batch-fail');
      },
      onFailure
    });

    const retryAll = vi.fn();

    const batch: MessageBatch<unknown> = {
      queue: 'test-queue',
      messages: [
        {
          id: 'm1',
          timestamp: new Date(),
          attempts: 1,
          body: { id: 'x' },
          ack: vi.fn(),
          retry: vi.fn()
        }
      ],
      ackAll: vi.fn(),
      retryAll
    };

    await getQueueInternals(queue).consume(batch, {}, executionCtx);

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(retryAll).toHaveBeenCalledWith({ delaySeconds: 7 });
  });
});
