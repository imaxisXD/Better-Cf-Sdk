import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const jsoncQueue = defineQueue({
  args: z.object({ value: z.string() }),
  retry: 2,
  handler: async () => {
    return;
  }
});
