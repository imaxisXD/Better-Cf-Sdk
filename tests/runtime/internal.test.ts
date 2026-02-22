import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { getQueueInternals } from '../../src/queue/internal.js';

describe('queue internals', () => {
  it('throws when object is not a queue handle', () => {
    expect(() => getQueueInternals({})).toThrow('Object is not a better-cf queue handle.');
    expect(() => getQueueInternals(null)).toThrow('Queue handle is not an object.');
  });

  it('stores internals as non-enumerable symbol', () => {
    const { defineQueue } = createSDK<Record<string, never>>();
    const queue = defineQueue({
      message: z.object({ id: z.string() }),
      process: async () => {
        return;
      }
    });

    const symbolKeys = Object.getOwnPropertySymbols(queue);
    expect(symbolKeys.length).toBeGreaterThan(0);
    const descriptor = Object.getOwnPropertyDescriptor(queue, symbolKeys[0]);
    expect(descriptor?.enumerable).toBe(false);
  });

  it('throws for invalid multi-job config with no jobs', () => {
    const { defineQueue } = createSDK<Record<string, never>>();

    expect(() =>
      defineQueue({
        retry: 2
      })
    ).toThrow('Multi-job queue config must define at least one job.');
  });
});
