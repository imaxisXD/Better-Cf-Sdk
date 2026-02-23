import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  args: z.object({ email: z.string().email() }),
  handler: async () => {}
});
