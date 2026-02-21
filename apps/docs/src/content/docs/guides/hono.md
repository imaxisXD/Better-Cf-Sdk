---
title: Integrate Hono with Queue SDK
description: Run Hono HTTP routing with queue definitions managed by better-cf generation.
---

Combine Hono routing with Queue SDK queue contracts while keeping generated queue wiring intact.

## What You Will Achieve

- define queue contract in Queue SDK style
- export a Hono app as worker entry
- run local automation with generated queue mapping

## Before You Start

- complete [Build Your First Queue](/guides/first-queue)
- install Hono in your project
- ensure `better-cf.config.ts` exports `defineQueue`

## Step 1: Define SDK and Queue

```ts
// better-cf.config.ts
import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_EMAIL: Queue;
};

export const { defineQueue } = createSDK<Env>();
```

```ts
// src/queues/email.ts (example path)
import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const emailQueue = defineQueue({
  message: z.object({ to: z.string().email() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.to);
  }
});
```

Expected output:

- queue declaration remains discoverable by generation pipeline

## Step 2: Export Hono Worker App

```ts
// worker.ts
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (ctx) => ctx.text('hono-queue'));

export default app;
```

Expected output:

- HTTP routing handled by Hono app export

## Step 3: Optionally Enqueue from Route

```ts
app.post('/enqueue', async (ctx) => {
  await emailQueue.send({ env: ctx.env }, { to: 'dev@example.com' });
  return ctx.json({ queued: true });
});
```

Expected output:

- route can enqueue typed messages through queue producer handle

## Step 4: Run Local Workflow

```bash
better-cf dev
```

Expected output:

- generated entry + Wrangler queue mapping remain synchronized
- Hono routes continue serving on local worker runtime

<div class="dx-callout">
  <strong>Good to know:</strong> keep queue contract logic in dedicated modules and keep Hono focused on HTTP concerns.
</div>

## Troubleshooting

### Queue not wired in Hono project

Confirm queue definitions are exported and imported from `better-cf.config`.

### Route enqueue fails at runtime

Check queue binding availability in `ctx.env` and rerun generation loop.

### Hono route works but queue consumer does not

Validate queue declaration mode and inspect generation diagnostics.

## Next Steps

- Tune delivery behavior in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Verify producer signatures in [Queue SDK API Reference](/api/queue)
- Validate runtime issues in [Troubleshoot Queue SDK Workflows](/guides/troubleshooting)
