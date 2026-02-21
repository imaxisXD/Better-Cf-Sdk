# better-cf

Opinionated Cloudflare Queue SDK + automation CLI designed for modern developer experience.

## Why better-cf

`better-cf` keeps Cloudflare Queue primitives but improves day-to-day ergonomics:

- typed queue contracts from one place
- less manual entry/config wiring
- structured automation for local dev and codegen
- predictable runtime and testing APIs

## Quickstart

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
npx better-cf init
npm run dev
```

## Canonical Imports

- Queue runtime: `better-cf/queue`
- Testing helpers: `better-cf/testing`
- CLI binary: `better-cf`

## Core Workflow

`better-cf dev` continuously orchestrates:

1. scan queue definitions
2. validate config
3. generate `.better-cf/entry.ts` and type files
4. patch wrangler queue sections
5. infer env types
6. run/restart `wrangler dev`
7. re-run on source/config changes

One-shot mode:

```bash
better-cf generate
```

## Example Patterns

### Single queue with typed payload

```ts
import { createSDK } from 'better-cf/queue';
import { z } from 'zod';

type Env = { QUEUE_SIGNUP: Queue };
const { defineQueue, defineWorker } = createSDK<Env>();

export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  process: async (ctx, msg) => {
    console.log(ctx.message.id, msg.email);
  },
  retry: 3,
  retryDelay: '30s'
});

export default defineWorker({
  async fetch() {
    return new Response('ok');
  }
});
```

### Batch mode

```ts
const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  batch: { maxSize: 10, timeout: '30s', maxConcurrency: 2 },
  processBatch: async (ctx, messages) => {
    console.log(messages.length, ctx.batch.queue);
    ctx.batch.ackAll();
  }
});
```

### Queue unit testing

```ts
import { testQueue } from 'better-cf/testing';

const result = await testQueue(signupQueue, {
  env: {},
  message: { email: 'dev@example.com' }
});

expect(result.acked).toHaveLength(1);
```

## Comparison with Cloudflare Queue Workflows

| Concern | Cloudflare path | better-cf path |
|---|---|---|
| Queue contract shape | Convention/custom runtime checks | `defineQueue({ message: z.object(...) })` |
| Entry + config wiring | Manual exports + Wrangler maintenance | Generated entry + automated Wrangler patching |
| Local dev orchestration | Team-managed scripts | One `better-cf dev` loop |
| Queue test harness | Custom mocks/harnesses | `testQueue` helper |

Detailed comparison: `/apps/docs/src/content/docs/comparison/cloudflare-vs-better-cf.mdx`

## Limitations

### Not supported

- Pull-message runtime abstraction implementation
- Queue metrics/dashboard abstraction
- Dynamic runtime queue declaration
- Unsupported remote queue local-dev parity modes

### Known gaps

- Non-literal config extraction can reduce static mapping fidelity
- Legacy service-worker adapter is compatibility-oriented
- Non-standard worker export patterns beyond documented variants are out of scope

Use native Cloudflare APIs directly where the SDK intentionally does not abstract.

## Docs

- Site source: `apps/docs`
- Getting started page: `apps/docs/src/content/docs/getting-started.md`
- File structure guide: `apps/docs/src/content/docs/guides/file-structure.md`
- Cookbook page: `apps/docs/src/content/docs/examples/cookbook.md`
