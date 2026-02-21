---
title: Migrate from Legacy Service Worker Mode
description: Use legacy compatibility mode only as a temporary migration bridge to module-worker patterns.
---

Use legacy mode only when migrating existing service-worker style workers and move to module-worker shape as soon as possible.

## What You Will Achieve

- enable temporary legacy compatibility in config
- understand behavior differences in generated runtime flow
- apply a staged migration back to module-worker mode

## Before You Start

- existing service-worker style codebase
- Queue SDK already integrated
- migration plan toward module-worker exports

## Step 1: Enable Compatibility Mode

```ts
// better-cf.config.ts
export const betterCfConfig = {
  legacyServiceWorker: true
};
```

Expected output:

- generated entry includes legacy compatibility handling

## Step 2: Keep Queue Patterns Modern During Migration

- keep queue contracts in `defineQueue(...)`
- keep env typing strategy consistent (`createSDK()` or `createSDK<Env>()`)
- avoid mixing old worker export patterns into new queue definitions

Expected output:

- queue behavior remains consistent while worker export shape is transitioned

## Step 3: Exit Legacy Mode

1. move worker exports to module-worker style (`defineWorker` or default module export)
2. remove `legacyServiceWorker: true`
3. rerun `better-cf generate` and validate deploy path

Expected output:

- project runs in recommended module-worker mode

<div class="dx-callout">
  <strong>Good to know:</strong> legacy mode is compatibility-only and not intended as a long-term parity runtime target.
</div>

## Troubleshooting

### Legacy mode enabled but runtime warnings persist

Warnings are expected as migration reminders; complete module-worker conversion to remove them.

### Migration breaks queue runtime behavior

Check worker export shape and ensure queue declarations were not altered during migration.

### Team starts new projects in legacy mode

Reserve legacy mode for migration projects only; use module-worker defaults for greenfield apps.

## Next Steps

- Confirm generated artifacts in [File Structure](/guides/file-structure)
- Validate deploy readiness with [Production Checklist](/guides/production-checklist)
- Debug migration issues via [Error Reference](/reference/errors)
