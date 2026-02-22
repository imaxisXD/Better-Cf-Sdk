import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const deliveryQueue = defineQueue({
  message: z.object({ id: z.string() }),
  process: async () => {},
  deliveryDelay: '45s',
  retryDelay: '10s'
});
