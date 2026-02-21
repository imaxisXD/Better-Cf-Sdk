---
title: Hono Guide
description: Run Hono with Queue SDK (Alpha) definitions and generated queue wiring.
---

Hono works with Queue SDK (Alpha) as long as queue definitions are discoverable and the generated entry is used.

## 1. Define SDK and Queue

```ts
// better-cf.config.ts
import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_EMAIL: Queue;
};

export const { defineQueue } = createSDK<Env>();
```

```ts
// src/queues/email.ts
import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const emailQueue = defineQueue({
  message: z.object({ to: z.string().email() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.to);
  }
});
```

## 2. Export Hono App

```ts
// worker.ts
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (ctx) => ctx.text('hono-queue'));

export default app;
```

## 3. Optional: Enqueue from a Route

```ts
app.post('/enqueue', async (ctx) => {
  await emailQueue.send({ env: ctx.env }, { to: 'dev@example.com' });
  return ctx.json({ queued: true });
});
```

## 4. Run with Automation

```bash
better-cf dev
```

The automation loop handles generated entry + Wrangler queue config updates while your Hono app remains your runtime surface.

<div class="dx-callout">
  <strong>Keep it simple:</strong> use Hono for HTTP routing and keep queue contract logic in dedicated `src/queues/*` modules.
</div>
