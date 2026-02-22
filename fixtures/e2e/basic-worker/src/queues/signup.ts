import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  retry: 3,
  deadLetter: 'dead-signups',
  process: async () => {
    return;
  }
});
