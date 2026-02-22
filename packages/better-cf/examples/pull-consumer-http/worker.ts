import { defineWorker } from './better-cf.config';
import { z } from 'zod';
import { defineQueue } from './better-cf.config';

export const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 5,
  deadLetter: 'pull-dlq'
});

export default defineWorker({
  async fetch() {
    return new Response('pull queue configured');
  }
});
