---
title: Getting Started
description: Ship your first queue with typed contracts and generated wiring.
---

## 1. Install

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
```

## 2. Initialize Project Files

```bash
npx better-cf init
```

This creates starter files for `better-cf.config.ts` and worker wiring.

## 3. Define SDK + Env

```ts
import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_SIGNUP: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
```

## 4. Define Your First Queue

```ts
import { z } from 'zod';
import { defineQueue } from './better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({
    email: z.string().email(),
    userId: z.string()
  }),
  retry: 3,
  retryDelay: '30s',
  process: async (_ctx, msg) => {
    console.log('processing signup', msg.email, msg.userId);
  }
});
```

## 5. Expose Worker Entry

```ts
import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response('queue-ready');
  }
});
```

## 6. Run Local Dev

```bash
npm run dev
```

`better-cf dev` automation loop will:

1. scan queue definitions
2. validate queue config
3. generate `.better-cf/entry.ts` and env types
4. patch Wrangler queue mapping
5. run/restart `wrangler dev`

## 7. Deploy

```bash
npm run deploy
```

## Next Steps

- Review more patterns in [Cookbook](/examples/cookbook)
- Compare tradeoffs in [Cloudflare vs better-cf](/comparison/cloudflare-vs-better-cf)
- Understand boundaries in [Limitations](/limitations)
