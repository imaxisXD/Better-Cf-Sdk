import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const legacyQueue = defineQueue({
  message: z.object({ id: z.string() }),
  process: async () => {
    return;
  }
});
