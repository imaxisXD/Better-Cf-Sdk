---
title: Queue SDK Cookbook
description: Source-backed Queue SDK (Alpha) implementation examples for common queue patterns.
---

Each example in this page targets Queue SDK (Alpha), the currently available package in the Better Cloudflare SDK suite.

Each pattern below maps to a real example in `/packages/better-cf/examples`.

## Basic Queue

Source: `packages/better-cf/examples/basic-queue`

```ts
import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.email);
  }
});
```

## Retry + Dead Letter

Source: `packages/better-cf/examples/retry-dead-letter`

```ts
export const emailQueue = defineQueue({
  message: z.object({ to: z.string() }),
  retry: 3,
  retryDelay: '20s',
  deadLetter: 'failed-email',
  process: async (ctx, message) => {
    console.log(ctx.message.attempts, message.to);
    throw new Error('simulate failure');
  }
});
```

## Batch Processing

Source: `packages/better-cf/examples/batch-processing`

```ts
export const auditQueue = defineQueue({
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

## Multi-Queue in One Worker

Source: `packages/better-cf/examples/multi-queue`

```ts
export const emailQueue = defineQueue({
  message: z.object({ to: z.string() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.to);
  }
});

export const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.action);
  }
});
```

## Multi-Job Queue

Source: `packages/better-cf/examples/multi-job-queue`

```ts
export const jobsQueue = defineQueue({
  signup: {
    message: z.object({ email: z.string().email() }),
    process: async (ctx, message) => {
      console.log(ctx.message.id, message.email);
    }
  },
  invoice: {
    message: z.object({ amount: z.number() }),
    process: async (ctx, message) => {
      console.log(ctx.message.id, message.amount);
    }
  }
});
```

## HTTP Pull Consumer Configuration

Source: `packages/better-cf/examples/pull-consumer-http`

```ts
export const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 5,
  deadLetter: 'pull-dlq'
});
```

## Hono Integration

Source: `packages/better-cf/examples/hono-queue`

```ts
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (ctx) => ctx.text('hono-queue'));

export default app;
```

## Testing with `testQueue`

```ts
import { testQueue } from 'better-cf/testing';

const result = await testQueue(signupQueue, {
  env: {},
  message: { email: 'dev@example.com' }
});

expect(result.acked).toHaveLength(1);
expect(result.retried).toHaveLength(0);
```

<div class="dx-callout">
  <strong>Tip:</strong> start from the closest cookbook pattern and then tighten Env typing with `createSDK&lt;Env&gt;()` once bindings stabilize.
</div>
