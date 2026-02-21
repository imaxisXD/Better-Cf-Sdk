---
title: Queue API
description: Runtime API surface for creating queues, workers, and typed producer calls.
---

## Canonical Imports

```ts
import { createSDK } from 'better-cf/queue';
```

## `createSDK<Env>()`

```ts
const { defineQueue, defineWorker } = createSDK<MyEnv>();
```

- `Env` is optional.
- Default mode (`createSDK()`) uses generated `BetterCfAutoEnv` bindings.
- Explicit mode (`createSDK<Env>()`) is recommended when your app owns strict env types.

## `defineQueue(...)`

`defineQueue` supports three queue shapes.

### 1. Single Queue: Push Consumer (`process`)

```ts
const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  retry: 3,
  deliveryDelay: '5s',
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.email);
  },
  onFailure: async (_ctx, _message, error) => {
    console.error(error.message);
  }
});
```

### 2. Single Queue: Batch Consumer (`processBatch`)

```ts
const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  batch: {
    maxSize: 10,
    timeout: '30s',
    maxConcurrency: 2
  },
  processBatch: async (ctx, messages) => {
    console.log(messages.length, ctx.batch.queue);
    ctx.batch.ackAll();
  }
});
```

### 3. Single Queue: HTTP Pull Configuration

```ts
const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 5,
  deadLetter: 'pull-dlq'
});
```

`http_pull` queues are config/admin focused in this SDK and cannot define `process`, `processBatch`, or `onFailure`.

### 4. Multi-Job Queue

```ts
const jobsQueue = defineQueue({
  retry: 2,
  signup: {
    message: z.object({ email: z.string().email() }),
    process: async () => {}
  },
  invoice: {
    message: z.object({ amount: z.number() }),
    process: async () => {}
  }
});
```

Multi-job queues expose per-job producers:

```ts
await jobsQueue.signup.send(ctx, { email: 'dev@example.com' });
await jobsQueue.invoice.send(ctx, { amount: 99 });
```

## Producer APIs

Every queue handle supports:

- `send(ctx, data, options?)`
- `sendBatch(ctx, messages, options?)`

```ts
await signupQueue.send(ctx, { email: 'dev@example.com' }, { delay: '10s', contentType: 'json' });

await signupQueue.sendBatch(
  ctx,
  [
    { data: { email: 'a@example.com' } },
    { data: { email: 'b@example.com' }, delay: '30s' }
  ],
  { contentType: 'json' }
);
```

`sendBatch` supports per-message overrides merged with batch-level defaults.

## `defineWorker(...)`

```ts
export default defineWorker({
  async fetch(request, ctx) {
    console.log(ctx.env);
    return new Response(request.method);
  },
  async scheduled(event, ctx) {
    console.log(event.cron, ctx.env);
  }
});
```

- `ctx.env` is typed as `QueueEnv<Env>`.
- Generated queue bindings are included in runtime env typing.

## Validation Constraints

Invalid queue definitions fail fast, for example:

- defining both `process` and `processBatch`
- defining neither in push mode
- using `consumer.type = "http_pull"` with push handlers
- multi-job queues with zero jobs
