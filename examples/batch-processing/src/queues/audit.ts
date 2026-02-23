import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const auditQueue = defineQueue({
  args: z.object({ action: z.string() }),
  batch: {
    maxSize: 10,
    timeout: '30s',
    maxConcurrency: 2
  },
  batchHandler: async (ctx) => {
    ctx.batch.ackAll();
  }
});
