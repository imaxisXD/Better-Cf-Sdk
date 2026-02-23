import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { getQueueInternals } from '../../src/queue/internal.js';

describe('defineQueue producer API', () => {
  it('sends a single message to configured binding', async () => {
    const { defineQueue } = createSDK<{ QUEUE_SIGNUP: { send: ReturnType<typeof vi.fn> } }>();

    const queue = defineQueue({
      args: z.object({ email: z.string().email() }),
      async handler() {
        return;
      }
    });

    const send = vi.fn(async () => undefined);
    const env = {
      QUEUE_SIGNUP: {
        send
      }
    };

    getQueueInternals(queue).setBinding('QUEUE_SIGNUP');
    await queue.send({ env }, { email: 'user@example.com' }, { delay: '10s', contentType: 'json' });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(
      { email: 'user@example.com' },
      { delaySeconds: 10, contentType: 'json' }
    );
  });

  it('sends batched messages with per-message options', async () => {
    const { defineQueue } = createSDK<{ QUEUE_SIGNUP: { sendBatch: ReturnType<typeof vi.fn> } }>();

    const queue = defineQueue({
      args: z.object({ email: z.string().email() }),
      async handler() {
        return;
      }
    });

    const sendBatch = vi.fn(async () => undefined);
    const env = {
      QUEUE_SIGNUP: {
        sendBatch
      }
    };

    getQueueInternals(queue).setBinding('QUEUE_SIGNUP');
    await queue.sendBatch(
      { env },
      [
        { data: { email: 'a@example.com' }, delay: '5s' },
        { data: { email: 'b@example.com' }, contentType: 'json' }
      ]
    );

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect(sendBatch).toHaveBeenCalledWith([
      { body: { email: 'a@example.com' }, delaySeconds: 5 },
      { body: { email: 'b@example.com' }, contentType: 'json' }
    ]);
  });

  it('supports batch-level sendBatch options with per-message override', async () => {
    const { defineQueue } = createSDK<{ QUEUE_SIGNUP: { sendBatch: ReturnType<typeof vi.fn> } }>();

    const queue = defineQueue({
      args: z.object({ email: z.string().email() }),
      async handler() {
        return;
      }
    });

    const sendBatch = vi.fn(async () => undefined);
    const env = {
      QUEUE_SIGNUP: {
        sendBatch
      }
    };

    getQueueInternals(queue).setBinding('QUEUE_SIGNUP');
    await queue.sendBatch(
      { env },
      [
        { data: { email: 'a@example.com' } },
        { data: { email: 'b@example.com' }, delay: '2s' }
      ],
      { delay: '10s', contentType: 'json' }
    );

    expect(sendBatch).toHaveBeenCalledTimes(1);
    expect(sendBatch).toHaveBeenCalledWith([
      { body: { email: 'a@example.com' }, delaySeconds: 10, contentType: 'json' },
      { body: { email: 'b@example.com' }, delaySeconds: 2, contentType: 'json' }
    ]);
  });

  it('throws when binding is not initialized', async () => {
    const { defineQueue } = createSDK<Record<string, unknown>>();

    const queue = defineQueue({
      args: z.object({ id: z.string() }),
      async handler() {
        return;
      }
    });

    await expect(queue.send({ env: {} }, { id: '1' })).rejects.toThrow('Queue binding not initialized');
  });

  it('throws clear migration error for legacy single-queue keys', () => {
    const { defineQueue } = createSDK<Record<string, unknown>>();
    const unsafeDefineQueue = defineQueue as (config: Record<string, unknown>) => unknown;

    expect(() =>
      unsafeDefineQueue({
        message: z.object({ id: z.string() }),
        process: async () => {
          return;
        }
      })
    ).toThrow('Rename message->args, process->handler, processBatch->batchHandler.');
  });

  it('throws clear migration error for legacy multi-job keys', () => {
    const { defineQueues } = createSDK<Record<string, unknown>>();
    const unsafeDefineQueues = defineQueues as (config: Record<string, unknown>) => unknown;

    expect(() =>
      unsafeDefineQueues({
        signup: {
          message: z.object({ id: z.string() }),
          process: async () => {
            return;
          }
        }
      })
    ).toThrow('Multi-job queue "signup" uses legacy keys.');
  });

  it('sends job envelopes for multi-job queues', async () => {
    const { defineQueues } = createSDK<{ QUEUE_JOBS: { send: ReturnType<typeof vi.fn> } }>();

    const jobs = defineQueues({
      signup: {
        args: z.object({ email: z.string() }),
        async handler() {
          return;
        }
      },
      invoice: {
        args: z.object({ amount: z.number() }),
        async handler() {
          return;
        }
      },
      retry: 2
    });

    const send = vi.fn(async () => undefined);
    const env = {
      QUEUE_JOBS: {
        send
      }
    };

    getQueueInternals(jobs).setBinding('QUEUE_JOBS');
    await jobs.signup.send({ env }, { email: 'dev@example.com' });

    expect(send).toHaveBeenCalledWith({ _job: 'signup', data: { email: 'dev@example.com' } }, {});
  });
});
