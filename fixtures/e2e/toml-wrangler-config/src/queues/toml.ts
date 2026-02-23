import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const tomlQueue = defineQueue({
  args: z.object({ value: z.string() }),
  retryDelay: '30s',
  handler: async () => {
    return;
  }
});
