import { z } from 'zod';
import { createSDK, type DurableFnKey, type WorkerContext } from '../../src/durable-object/index.js';

declare module '../../src/durable-object/index.js' {
  interface BetterCfGeneratedBindings {
    DO_ROOM: DurableObjectNamespace;
    QUEUE_EMAIL: Queue;
  }

  interface BetterCfGeneratedApi {
    room: {
      sendMessage(key: string, args: { body: string; author: string }): Promise<{ ok: true }>;
      $raw: {
        idFromName(key: string): DurableObjectId;
        newUniqueId(options?: { jurisdiction?: string }): DurableObjectId;
      };
    };
    $internal: {
      room: {
        markEmailSent(key: string, args: { to: string }): Promise<null>;
      };
    };
    emailQueue: {
      send(args: { roomId: string; to: string; body: string }): Promise<void>;
      sendBatch(
        messages: Array<{
          data: { roomId: string; to: string; body: string };
          delay?: `${number}s`;
          contentType?: 'json' | 'text' | 'bytes' | 'v8';
        }>
      ): Promise<void>;
    };
  }
}

type Env = {
  RESEND_API_KEY: string;
};

const { defineDurableObject, defineQueue, defineWorker } = createSDK<Env>();

const room = defineDurableObject({
  name: 'Room',
  key: z.string()
});

const sendMessage = room.fn({
  args: z.object({
    body: z.string(),
    author: z.string()
  }),
  returns: z.object({
    ok: z.literal(true)
  }),
  handler: async ({ storage }, args) => {
    await storage.put('last-message', args);
    return { ok: true };
  }
});

const markEmailSent = room.internal({
  args: z.object({
    to: z.string().email()
  }),
  handler: async () => null
});

const emailQueue = defineQueue({
  args: z.object({
    roomId: z.string(),
    to: z.string().email(),
    body: z.string()
  })
});

emailQueue.message({
  handler: async (ctx, job) => {
    await ctx.api.room.sendMessage(job.roomId, {
      body: job.body,
      author: 'system'
    });
  }
});

const worker = defineWorker({
  async fetch(_request, ctx) {
    await ctx.api.room.sendMessage('general', {
      body: 'hello',
      author: 'abhi'
    });

    await ctx.api.emailQueue.send({
      roomId: 'general',
      to: 'team@example.com',
      body: 'message'
    });

    await ctx.api.emailQueue.sendBatch([
      {
        data: {
          roomId: 'general',
          to: 'team@example.com',
          body: 'message'
        },
        delay: '30s',
        contentType: 'json'
      }
    ]);

    return new Response('ok');
  }
});

const workerCtx = {} as WorkerContext<Env>;
workerCtx.api.room.sendMessage('general', {
  body: 'hello',
  author: 'abhi'
});
workerCtx.api.$internal.room.markEmailSent('general', {
  to: 'team@example.com'
});
workerCtx.api.room.$raw.idFromName('general');
workerCtx.api.room.$raw.newUniqueId({ jurisdiction: 'eu' });

const roomKey: DurableFnKey<typeof sendMessage> = 'general';
roomKey.toUpperCase();
const internalRoomKey: DurableFnKey<typeof markEmailSent> = 'general';
internalRoomKey.toUpperCase();

// @ts-expect-error durable object keys are string-typed here
const invalidRoomKey: DurableFnKey<typeof sendMessage> = 123;

// @ts-expect-error missing durable object key
workerCtx.api.room.sendMessage({
  body: 'hello',
  author: 'abhi'
});

// @ts-expect-error wrong queue payload shape
workerCtx.api.emailQueue.send({
  roomId: 'general',
  to: 'team@example.com'
});

// @ts-expect-error internal method payload shape is enforced
workerCtx.api.$internal.room.markEmailSent('general', { email: 'team@example.com' });

void worker;
