import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const auditQueue = defineQueue({
  args: z.object({ action: z.string() }),
  batch: {
    maxSize: 20,
    timeout: '30s',
    maxConcurrency: 4
  },
  batchHandler: async (ctx, messages) => {
    if (messages.length === 0) {
      ctx.batch.retryAll();
      return;
    }
    ctx.batch.ackAll();
  }
});
