import { defineWorker } from './better-cf.config';
import { signupQueue } from './src/queues/signup';

export default defineWorker({
  async fetch(_request, ctx) {
    await signupQueue.send(ctx, { email: 'user@example.com' });
    return new Response('ok');
  }
});
