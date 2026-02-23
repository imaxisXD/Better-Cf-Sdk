---
title: Build Your First Queue
description: Define one queue, wire one worker, and run the local generation loop end-to-end.
---

Ship one working queue flow with typed payload validation and generated Cloudflare wiring.

## What You Will Achieve

- define an exported queue contract with `defineQueue(...)`
- keep worker runtime handlers in `defineWorker(...)`
- run local dev with generated queue entry + Wrangler mapping

## Before You Start

- complete [Installation & Prereqs](/guides/installation)
- `better-cf.config.ts` available from `better-cf init` (existing project) or `better-cf create` (new project)
- `worker.ts` available in project root

## Step 1: Define Queue SDK in `better-cf.config.ts`

```ts
import { createSDK } from 'better-cf/queue';

export const { defineQueue, defineWorker } = createSDK();
```

Expected output:

- `defineQueue` and `defineWorker` are exported from the same config module

## Step 2: Create an Exported Queue Definition

Create `src/queues/signup.ts` (example path):

```ts
import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  args: z.object({
    email: z.string().email(),
    userId: z.string()
  }),
  retry: 3,
  retryDelay: '30s',
  handler: async (ctx, message) => {
    console.log('signup', ctx.message.id, message.email, message.userId);
  }
});
```

Expected output:

- queue is discoverable because the `defineQueue(...)` call is exported

## Step 3: Keep Runtime Entry Focused in `worker.ts`

```ts
import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response('queue-ready');
  }
});
```

Expected output:

- Worker entry handles HTTP or scheduled logic
- queue consumer wiring is generated, not hand-wired

## Step 4: Run Local Dev

```bash
npm run dev
```

Expected output:

- generated files under `.better-cf/`
- Wrangler config queue sections synchronized
- local worker process starts

<div class="dx-callout">
  <strong>Good to know:</strong> queue name and binding are derived from export name. For example, <code>signupQueue</code> maps to queue <code>signup</code> and binding <code>QUEUE_SIGNUP</code>.
</div>

## Troubleshooting

### Queue not detected

Confirm the queue declaration is exported and `defineQueue` is imported from your `better-cf.config` module.

### Queue name conflict diagnostic

Rename conflicting queue exports so derived queue names are unique.

### Local dev fails after edits

Re-run `npm run dev` and inspect diagnostics for non-static config warnings or scanner parse errors.

## Next Steps

- Learn message send patterns in [Producer Patterns](/guides/producer-patterns)
- Choose consumer mode in [Consumer Patterns](/guides/consumer-patterns)
- Understand automation internals in [Automation CLI](/guides/automation-cli)
