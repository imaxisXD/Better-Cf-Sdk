import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const tomlQueue = defineQueue({
  message: z.object({ value: z.string() }),
  retryDelay: '30s',
  process: async () => {
    return;
  }
});
