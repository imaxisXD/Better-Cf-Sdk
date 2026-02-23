import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const emailQueue = defineQueue({
  args: z.object({ to: z.string() }),
  retry: 3,
  retryDelay: '20s',
  deadLetter: 'failed-email',
  handler: async () => {
    throw new Error('simulate failure');
  }
});
