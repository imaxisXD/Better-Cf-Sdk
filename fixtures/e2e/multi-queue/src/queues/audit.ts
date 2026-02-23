import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const auditQueue = defineQueue({
  args: z.object({ action: z.string() }),
  handler: async () => {
    return;
  }
});
