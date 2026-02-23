import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const legacyQueue = defineQueue({
  args: z.object({ id: z.string() }),
  handler: async () => {
    return;
  }
});
