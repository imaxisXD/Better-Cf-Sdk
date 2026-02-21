---
title: Queue SDK Quickstart
description: Ship your first typed queue in minutes using generated wiring and local automation.
---

Build one working queue consumer flow quickly, then branch into focused guides for production hardening.

## What You Will Achieve

- initialize Queue SDK in your project
- define one typed queue and one worker entry
- run local generation and deploy workflow

## Before You Start

- Node.js `>=18.18`
- dependencies installed (see [Installation & Prereqs](/guides/installation))
- a project folder where you can run `npm` commands

## Step 1: Initialize Project Files

```bash
npx better-cf init
```

Expected output:

- `better-cf.config.ts` and `worker.ts` are present
- `.better-cf/` output folder exists

## Step 2: Define SDK Exports

```ts
import { createSDK } from 'better-cf/queue';

export const { defineQueue, defineWorker } = createSDK();
```

Expected output:

- queue and worker helpers are exported from one config module

## Step 3: Define One Queue

```ts
import { z } from 'zod';
import { defineQueue } from './better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({
    email: z.string().email(),
    userId: z.string()
  }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.email, message.userId);
  }
});
```

Expected output:

- queue discovery picks up exported queue declaration

## Step 4: Expose Worker Entry

```ts
import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response('queue-ready');
  }
});
```

Expected output:

- runtime entry remains focused on HTTP/scheduled handlers

## Step 5: Run Dev and Deploy

```bash
npm run dev
npm run deploy
```

Expected output:

- local generation + `wrangler dev` loop runs
- deploy runs generation first, then deploy command

<div class="dx-callout">
  <strong>Good to know:</strong> queue files can live in any folder path. Discovery is based on exported <code>defineQueue(...)</code> usage imported from <code>better-cf.config</code>.
</div>

## Troubleshooting

### `NO_QUEUES_FOUND`

Export your queue declaration and ensure `defineQueue` is imported from your `better-cf.config` module.

### `REMOTE_QUEUE_DEV_UNSUPPORTED`

Run `better-cf dev` without `--remote`.

### Queue binding runtime errors

Run the full generation workflow and confirm managed Wrangler queue sections are present.

## Next Steps

- Set up dependencies and project checks in [Installation & Prereqs](/guides/installation)
- Build with full walkthrough detail in [Build Your First Queue](/guides/first-queue)
- Learn producer/consumer design in [Producer Patterns](/guides/producer-patterns)
