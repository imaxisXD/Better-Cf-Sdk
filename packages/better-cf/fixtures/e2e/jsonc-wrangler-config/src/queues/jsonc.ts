import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const jsoncQueue = defineQueue({
  message: z.object({ value: z.string() }),
  retry: 2,
  process: async () => {
    return;
  }
});
