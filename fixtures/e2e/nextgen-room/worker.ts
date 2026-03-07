import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch(_request, ctx) {
    await ctx.api.room.sendMessage('general', {
      body: 'hello',
      author: 'abhi'
    });

    await ctx.api.emailQueue.send({
      roomId: 'general',
      to: 'team@example.com',
      body: 'New message'
    });

    await ctx.api.jobs.email.send({
      roomId: 'general',
      body: 'background'
    });

    return new Response('ok');
  }
});
