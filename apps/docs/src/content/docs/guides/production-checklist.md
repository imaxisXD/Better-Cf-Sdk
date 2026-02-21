---
title: Run the Production Checklist
description: Validate queue config, generation output, and deployment readiness before shipping.
---

Use this checklist before each release to keep queue deployment predictable and reversible.

## What You Will Achieve

- validate queue definitions and generated artifacts before deploy
- confirm operational settings for retry, DLQ, and consumers
- reduce release risk with explicit preflight checks

## Before You Start

- complete local iteration with `better-cf dev`
- ensure CI can run project checks
- ensure Wrangler auth for target account/environment

## Step 1: Validate Generation and Types

Run:

```bash
better-cf generate
```

Expected output:

- `.better-cf/entry.ts` and generated type files refresh without errors
- supported Wrangler config is patched with managed queue sections

## Step 2: Confirm Queue Reliability Settings

Checklist:

- retry and dead-letter settings are explicit where needed
- batch size/concurrency reflect downstream system capacity
- pull vs push mode is intentional per queue

Expected output:

- no unresolved ambiguity in queue behavior under failure or high load

## Step 3: Verify Command and Docs Checks in CI

Run:

```bash
npm run check:docs
npm run docs:build
```

Expected output:

- docs source is complete and route-valid
- no broken docs links introduced by release changes

## Step 4: Deploy

Run:

```bash
npm run deploy
```

Expected output:

- generation pipeline runs first
- `wrangler deploy` completes with queue bindings aligned

<div class="dx-callout">
  <strong>Good to know:</strong> keep queue config and admin operations reviewable in pull requests. Explicit queue settings prevent hidden runtime drift.
</div>

## Troubleshooting

### Deploy works locally but fails in CI

Check Wrangler auth setup and environment variable availability in CI.

### Runtime cannot find queue binding

Confirm generated binding names match runtime env and Wrangler queue producer mappings.

### Queue processing regressed after deploy

Check recent changes to retry/batch settings and revert to last known stable config if needed.

## Next Steps

- Operate resources with [Queue Admin CLI](/guides/queue-admin-cli)
- Debug failures using [Troubleshooting](/guides/troubleshooting)
- Audit queue mapping with [Wrangler Mapping](/reference/wrangler-mapping)
