import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const deliveryQueue = defineQueue({
  args: z.object({ id: z.string() }),
  handler: async () => {},
  deliveryDelay: '45s',
  retryDelay: '10s'
});
