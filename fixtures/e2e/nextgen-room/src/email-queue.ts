import { emailQueue, jobs } from './schema';

export const emailQueueConsumer = emailQueue.message({
  description: 'Deliver one email message.',
  handler: async (ctx, job) => {
    await ctx.api.room.sendMessage(job.roomId, {
      body: job.body,
      author: 'system'
    });

    await ctx.api.$internal.room.markEmailSent(job.roomId, {
      to: job.to
    });
  }
});

export const emailJobConsumer = jobs.email.message({
  description: 'Expand multi-job queue email jobs into the email queue.',
  handler: async (ctx, job) => {
    await ctx.api.emailQueue.send({
      roomId: job.roomId,
      to: 'team@example.com',
      body: job.body
    });
  }
});
