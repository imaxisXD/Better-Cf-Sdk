import { z } from 'zod';
import { defineQueues } from '../../better-cf.config';

export const jobsQueue = defineQueues({
  signup: {
    args: z.object({ email: z.string().email() }),
    handler: async () => {
      return;
    }
  },
  invoice: {
    args: z.object({ amount: z.number() }),
    handler: async () => {
      return;
    }
  },
  retryDelay: '10s'
});
