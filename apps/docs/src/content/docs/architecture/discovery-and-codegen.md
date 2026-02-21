---
title: Understand Discovery and Codegen
description: Architecture view of queue scanning, validation, generated entry output, and Wrangler patching.
---

This page explains the internal docs-facing pipeline that runs during `better-cf dev`, `generate`, and `deploy`.

## What You Will Achieve

- understand how exported queue declarations become runtime wiring
- trace where diagnostics are generated and why they fail builds
- understand which files are generated and which are authored

## Before You Start

- read [File Structure](/guides/file-structure)
- know the core commands: `better-cf dev`, `better-cf generate`, `better-cf deploy`

## Step 1: Queue Discovery Scan

The scanner walks project source files and looks for exported `defineQueue(...)` calls imported from your `better-cf.config` module.

Expected output:

- discovered queue list with derived queue name + binding name
- diagnostics for conflicts or invalid queue shape

## Step 2: Validation and Diagnostics

Discovery emits diagnostics such as:

- `INVALID_PROCESS_MODE`
- `INVALID_PULL_MODE_HANDLER`
- `UNSUPPORTED_PULL_MULTIJOB`
- `QUEUE_NAME_CONFLICT`
- `BINDING_NAME_CONFLICT`

Expected output:

- generation halts on error-level diagnostics
- warning-level diagnostics remain visible for refinement

## Step 3: Code Generation

When discovery succeeds, generation writes managed outputs:

- `.better-cf/entry.ts`
- `.better-cf/types.d.ts`
- `.better-cf/wrangler-env.d.ts`
- `.better-cf/auto-env.d.ts`

Expected output:

- queue consumers/producers are wired in generated entry
- env typing artifacts are refreshed

## Step 4: Wrangler Config Patching

The CLI patches supported Wrangler configs and keeps queue producer/consumer sections synchronized from discovered queue definitions.

Expected output:

- `main` points at `.better-cf/entry.ts`
- managed queue sections match queue declaration state

<div class="dx-callout">
  <strong>Good to know:</strong> this architecture assumes deterministic queue declarations. Literal, exported config keeps discovery and patch output predictable.
</div>

## Troubleshooting

### Scanner misses queue files

Confirm queue calls are exported and imported from `better-cf.config`.

### Generated entry is stale

Run `better-cf generate` and verify `.better-cf/` output timestamps update.

### Wrangler mapping drift

Inspect queue declarations for non-static values and resolve warnings before deploy.

## Next Steps

- See exact config mapping in [Wrangler Mapping](/reference/wrangler-mapping)
- Review command-level behavior in [CLI Command Reference](/reference/cli-reference)
- Inspect failure codes in [Error Reference](/reference/errors)
