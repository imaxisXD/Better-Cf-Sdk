import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const jobsQueue = defineQueue({
  signup: {
    message: z.object({ email: z.string().email() }),
    process: async () => {
      return;
    }
  },
  invoice: {
    message: z.object({ amount: z.number() }),
    process: async () => {
      return;
    }
  },
  retryDelay: '10s'
});
