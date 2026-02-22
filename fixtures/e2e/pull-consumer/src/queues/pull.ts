import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 4,
  deadLetter: 'pull-dlq'
});
