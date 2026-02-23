import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSDK } from '../../src/queue/index.js';
import { testQueue } from '../../src/testing/index.js';

describe('testQueue option validation', () => {
  const { defineQueue } = createSDK<Record<string, unknown>>();
  const queue = defineQueue({
    args: z.object({ id: z.string() }),
    async handler() {
      return;
    }
  });

  it('throws when both message and messages are provided', async () => {
    await expect(
      testQueue(queue, {
        env: {},
        message: { id: '1' },
        messages: [{ id: '2' }]
      } as never)
    ).rejects.toThrow('testQueue accepts either message or messages, not both.');
  });

  it('throws when neither message nor messages is provided', async () => {
    await expect(
      testQueue(queue, {
        env: {}
      } as never)
    ).rejects.toThrow('testQueue requires message or messages.');
  });
});
