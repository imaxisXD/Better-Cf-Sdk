import { defineWorker } from './better-cf.config';
import { z } from 'zod';
import { defineQueue } from './better-cf.config';

export const emailQueue = defineQueue({
  args: z.object({ to: z.string().email() }),
  handler: async (ctx, msg) => {
    console.log(ctx.env, msg.to);
  }
});

export default defineWorker({
  async fetch(_req, ctx) {
    await emailQueue.send(ctx, { to: 'dev@example.com' });
    return new Response('queued');
  }
});
