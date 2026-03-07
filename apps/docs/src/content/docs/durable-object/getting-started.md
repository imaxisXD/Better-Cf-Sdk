---
title: Durable Object Quickstart
description: Start the next-gen better-cf surface with schema.ts, room.fn, queue.message, and generated ctx.api clients.
---

The primary `better-cf` surface is now `better-cf/durable-object`.

## What You Will Achieve

- declare Durable Objects and queues in one `schema.ts`
- implement behavior in sibling files with `room.fn(...)` and `queue.message(...)`
- call generated clients through `ctx.api`

## Install

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
```

## Step 1: Create the SDK Root

```ts
// better-cf.config.ts
import { createSDK } from 'better-cf/durable-object';

export const sdk = createSDK();
export const defineWorker = sdk.defineWorker;
```

## Step 2: Declare Resources in `schema.ts`

```ts
// src/schema.ts
import { z } from 'zod';
import { sdk } from '../better-cf.config';

export const room = sdk.defineDurableObject({
  name: 'Room',
  key: z.string(),
  version: 1
});

export const emailQueue = sdk.defineQueue({
  args: z.object({
    roomId: z.string(),
    to: z.string().email(),
    body: z.string()
  }),
  retry: 3,
  retryDelay: '30s'
});
```

## Step 3: Implement Runtime Behavior

```ts
// src/room.ts
import { z } from 'zod';
import { room } from './schema';

export const sendMessage = room.fn({
  args: z.object({
    body: z.string(),
    author: z.string()
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
  handler: async (ctx, job) => {
    await ctx.api.room.sendMessage(job.roomId, {
      body: job.body,
      author: 'system'
    });
  }
});
```

## Step 4: Use the Generated Client

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

## Step 5: Generate Wiring

```bash
better-cf generate
```

That writes:

- `.better-cf/entry.ts`
- `.better-cf/types.d.ts`
- `.better-cf/auto-env.d.ts`
- Wrangler queue and Durable Object config
- SQLite migration state for Durable Objects

## Next Steps

- Learn the ownership model in [schema.ts Model](/durable-object/schema-model)
- Define methods in [Functions + ctx.api](/durable-object/functions-and-ctx-api)
- Compose queues and Durable Objects in [Queue + Durable Object Patterns](/durable-object/queue-integration)
