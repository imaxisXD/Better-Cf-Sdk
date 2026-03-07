import { z } from 'zod';
import { sdk } from '../better-cf.config';

export const room = sdk.defineDurableObject({
  name: 'Room',
  key: z.string(),
  version: 1,
  description: 'Chat room state.'
});

export const emailQueue = sdk.defineQueue({
  description: 'Email fanout queue.',
  args: z.object({
    roomId: z.string(),
    to: z.string().email(),
    body: z.string()
  }),
  retry: 3,
  retryDelay: '30s'
});

export const jobs = sdk.defineQueues({
  description: 'Background jobs.',
  retry: 2,
  email: {
    description: 'Email job payload.',
    args: z.object({
      roomId: z.string(),
      body: z.string()
    })
  },
  audit: {
    description: 'Audit job payload.',
    args: z.object({
      roomId: z.string()
    })
  }
});
