import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const emailQueue = defineQueue({
  args: z.object({ to: z.string().email() }),
  handler: async () => {
    return;
  }
});
