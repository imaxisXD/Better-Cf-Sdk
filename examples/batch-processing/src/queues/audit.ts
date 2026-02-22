import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  batch: {
    maxSize: 10,
    timeout: '30s',
    maxConcurrency: 2
  },
  processBatch: async (ctx) => {
    ctx.batch.ackAll();
  }
});
