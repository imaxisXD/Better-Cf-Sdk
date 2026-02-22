import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const emailQueue = defineQueue({
  message: z.object({ to: z.string() }),
  process: async () => {}
});
