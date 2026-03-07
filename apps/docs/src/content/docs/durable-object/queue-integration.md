---
title: Queue + Durable Object Patterns
description: Use queues and Durable Objects together with the schema.ts registry and generated ctx.api clients.
---

Queues and Durable Objects solve different problems.

- queues handle ingress, retry, buffering, and fan-out
- Durable Objects handle ordering, per-key coordination, alarms, and state

That split is the core architecture better-cf optimizes for.

## Single Queue Consumer Into a Durable Object

```ts
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

## Multi-Job Queue

```ts
export const jobs = sdk.defineQueues({
  email: {
    args: z.object({
      roomId: z.string(),
      body: z.string()
    })
  },
  audit: {
    args: z.object({
      roomId: z.string()
    })
  }
});
```

```ts
export const emailJobConsumer = jobs.email.message({
  handler: async (ctx, job) => {
    await ctx.api.emailQueue.send({
      roomId: job.roomId,
      to: 'team@example.com',
      body: job.body
    });
  }
});
```

## Runtime Calls

```ts
await ctx.api.room.sendMessage(roomId, {
  body: 'hello',
  author: 'abhi'
});

await ctx.api.emailQueue.send({
  roomId,
  to: 'team@example.com',
  body: 'hello'
});
```

## Design Rules

- choose Durable Object keys around the unit of coordination: room, cart, user, document, tenant
- keep queue delivery idempotent because Cloudflare queues are at-least-once
- use queue message IDs or application request IDs when mutating Durable Objects from queues
- avoid routing every queue message into one global Durable Object key unless you want serialized throughput

## Legacy Queue Comparison

The old `better-cf/queue` surface embedded the consumer directly inside `defineQueue(...)`.

The new surface splits that apart:

- `schema.ts` declares the queue
- `queue.message(...)` or `queue.batch(...)` registers the worker behavior
- `ctx.api` sends messages and invokes Durable Object methods
