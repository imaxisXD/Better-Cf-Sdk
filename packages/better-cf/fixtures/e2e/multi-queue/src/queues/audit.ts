import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  process: async () => {
    return;
  }
});
