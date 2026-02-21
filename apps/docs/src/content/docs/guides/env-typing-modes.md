---
title: Choose Env Typing Mode
description: Decide between generated auto-env inference and explicit Env ownership in Queue SDK.
---

Pick an env typing strategy that matches your team’s development stage and type-governance needs.

## What You Will Achieve

- use auto env mode for faster early iteration
- use explicit env mode for strict contract ownership
- adopt a migration path from auto to explicit typing when needed

## Before You Start

- Queue SDK initialized in project
- `createSDK` imported from `better-cf/queue`
- understanding of queue binding names in your app

## Step 1: Use Auto Mode (Default)

```ts
import { createSDK } from 'better-cf/queue';

export const { defineQueue, defineWorker } = createSDK();
```

Expected output:

- env types are inferred from generated `.better-cf/auto-env.d.ts`
- onboarding requires minimal type boilerplate

## Step 2: Use Explicit Mode (`createSDK<Env>()`)

```ts
import { createSDK } from 'better-cf/queue';

type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  QUEUE_EMAIL: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
```

Expected output:

- env surface is fully app-owned and compile-time checked

## Step 3: Apply a Migration Strategy

1. start in auto mode for fast queue iteration
2. switch to explicit mode when bindings stabilize
3. keep generation loop (`dev/generate/deploy`) in both modes

Expected output:

- stable transition without changing queue runtime behavior

<div class="dx-callout">
  <strong>Good to know:</strong> explicit mode raises type strictness but does not replace generated queue wiring requirements.
</div>

## Troubleshooting

### Missing env properties in explicit mode

Update your `Env` type to include all runtime bindings used by queue and worker logic.

### Unexpected env type in auto mode

Re-run generation and verify `.better-cf/auto-env.d.ts` is up to date.

### Team confusion on mode choice

Document one default mode per service and treat mode switches as intentional PR changes.

## Next Steps

- See generated file flow in [File Structure](/guides/file-structure)
- Validate runtime APIs in [Queue SDK API Reference](/api/queue)
- Prepare stable deploys with [Production Checklist](/guides/production-checklist)
