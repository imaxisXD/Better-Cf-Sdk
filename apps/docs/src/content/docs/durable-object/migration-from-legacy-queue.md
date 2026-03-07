---
title: Legacy Queue Migration
description: Move from the original better-cf/queue inline-consumer model to the new schema.ts plus external builder surface.
---

The old queue surface remains supported, but new work should move to `better-cf/durable-object`.

## Old Shape

```ts
import { createSDK } from 'better-cf/queue';

const { defineQueue } = createSDK();

export const emailQueue = defineQueue({
  args: z.object({
    roomId: z.string(),
    body: z.string()
  }),
  handler: async (ctx, job) => {
    console.log(ctx.message.id, job.roomId);
  }
});
```

## New Shape

```ts
// src/schema.ts
export const emailQueue = sdk.defineQueue({
  args: z.object({
    roomId: z.string(),
    body: z.string()
  })
});
```

```ts
// src/email-queue.ts
export const emailQueueConsumer = emailQueue.message({
  handler: async (ctx, job) => {
    console.log(ctx.message.id, job.roomId);
  }
});
```

## Migration Steps

1. Move resource declarations into `schema.ts`.
2. Replace inline `handler` with `queue.message(...)` or `queue.batch(...)`.
3. Replace direct queue sends with generated `ctx.api.queueName.send(...)` where applicable.
4. Introduce `defineDurableObject(...)` only where you need per-key state or coordination.
5. Keep existing `better-cf/queue` code in place while migrating incrementally if needed.

## Important Difference

The new surface treats queues and Durable Objects as one system:

- `schema.ts` is the resource registry
- external builders register worker behavior
- generated `ctx.api` is the runtime client
