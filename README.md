# better-cf

Functional, type-safe Cloudflare SDKs for Durable Objects and Queues.

## Canonical Imports

- Primary next-gen surface: `better-cf/durable-object`
- Legacy queue surface: `better-cf/queue`
- Testing helpers: `better-cf/testing`
- CLI binary: `better-cf`

## Quickstart

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
npx better-cf init
npm run dev
```

Create a new worker:

```bash
npx better-cf create my-worker
cd my-worker
npm run dev
```

## Primary Surface: `better-cf/durable-object`

Use `schema.ts` as the resource registry, keep runtime behavior in sibling files, and call everything through generated `ctx.api`.

```ts
// better-cf.config.ts
import { createSDK } from 'better-cf/durable-object';

export const sdk = createSDK();
export const defineWorker = sdk.defineWorker;
```

```ts
// src/schema.ts
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
```

```ts
// src/room.ts
import { z } from 'zod';
import { room } from './schema';

export const sendMessage = room.fn({
  description: 'Append a room message.',
  args: z.object({
    body: z.string(),
    author: z.string()
  }),
  returns: z.object({
    ok: z.literal(true)
  }),
  handler: async ({ storage }, args) => {
    const messages = ((await storage.get('messages')) as unknown[] | undefined) ?? [];
    messages.push(args);
    await storage.put('messages', messages);
    return { ok: true };
  }
});
```

```ts
// src/email-queue.ts
import { emailQueue } from './schema';

export const emailQueueConsumer = emailQueue.message({
  description: 'Deliver one email message.',
  handler: async (ctx, job) => {
    await ctx.api.room.sendMessage(job.roomId, {
      body: job.body,
      author: 'system'
    });
  }
});
```

```ts
// worker.ts
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

    return new Response('ok');
  }
});
```

What the generator adds:

- `.better-cf/entry.ts` with worker, queue, and Durable Object wiring
- `.better-cf/types.d.ts` with `ctx.api` typing and JSDoc
- Wrangler queue and `durable_objects` bindings
- SQLite Durable Object migrations

## Legacy Queue Surface

`better-cf/queue` remains available for the original inline-consumer model.

```ts
import { createSDK } from 'better-cf/queue';
import { z } from 'zod';

const { defineQueue } = createSDK();

export const signupQueue = defineQueue({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, msg) => {
    console.log(ctx.message.id, msg.email);
  }
});
```

Use this surface for existing projects. New projects should prefer `better-cf/durable-object`.

## Testing

Legacy inline queues:

```ts
import { testQueue } from 'better-cf/testing';

const result = await testQueue(signupQueue, {
  env: {},
  message: { email: 'dev@example.com' }
});

expect(result.acked).toHaveLength(1);
```

Next-gen external consumers and durable functions:

```ts
import { testDurableFunction, testQueueConsumer } from 'better-cf/testing';

await testDurableFunction(sendMessage, {
  env: {},
  args: { body: 'hello', author: 'abhi' }
});

await testQueueConsumer(emailQueue, emailQueueConsumer, {
  env: {},
  api: {
    room: {
      sendMessage: async () => ({ ok: true })
    }
  },
  message: {
    roomId: 'general',
    to: 'team@example.com',
    body: 'hello'
  }
});
```

## Core Workflow

`better-cf dev` continuously:

1. scans declarations and external registrations
2. validates config and ownership rules
3. generates `.better-cf/entry.ts` and type files
4. patches Wrangler queues, Durable Objects, and SQLite migrations
5. infers env types
6. runs or restarts `wrangler dev`

One-shot generation:

```bash
better-cf generate
```

## Scope

The next-gen surface intentionally stays thin over Cloudflare primitives:

- typed Durable Object RPC methods, alarms, fetch, init, and WebSocket hibernation hooks
- typed queue producers and external consumers
- generated `ctx.api` clients and Wrangler wiring
- raw escape hatches for native Durable Object namespace methods when needed

Use native Cloudflare APIs directly when the SDK intentionally does not abstract an edge case yet.

## Docs

The full docs live under `apps/docs`, including the new Durable Object section, coverage matrix, migration guide, and legacy queue docs.
