---
title: Troubleshoot Queue SDK Workflows
description: Resolve the most common discovery, generation, runtime, and CLI operation failures.
---

Use this page to move from error code to concrete fix quickly.

## What You Will Achieve

- isolate whether failures come from discovery, generation, runtime, or admin commands
- resolve common diagnostics with targeted checks
- restore local and CI workflows with minimal guesswork

## Before You Start

- reproduce the failure once and capture full CLI output
- note command context (`dev`, `generate`, `deploy`, or admin command)
- identify the queue file or config touched most recently

## Step 1: Classify the Failure Stage

- discovery errors: queue declaration parsing and validation
- generation errors: `.better-cf` output and Wrangler patching
- runtime errors: binding lookup or handler execution
- admin errors: Wrangler-wrapped queue/subscription operations

Expected output:

- one clear failure stage identified before changing code

## Step 2: Apply Error-to-Fix Mapping

| Error / Symptom | Typical cause | First fix |
|---|---|---|
| `NO_QUEUES_FOUND` | no exported `defineQueue(...)` declarations discovered | export queue declarations and import `defineQueue` from `better-cf.config` |
| `QUEUE_DISCOVERY_FAILED` | blocking diagnostics (conflicts or invalid modes) | fix listed diagnostics and rerun `better-cf generate` |
| `NON_STATIC_CONFIG` warning | dynamic/non-literal queue config key | replace with literal value where possible |
| `REMOTE_QUEUE_DEV_UNSUPPORTED` | running `better-cf dev --remote` | run `better-cf dev` without `--remote` |
| `Queue binding not initialized` | producer call before generated entry wiring | run through `dev/generate/deploy` pipeline |
| `WRANGLER_QUEUE_COMMAND_FAILED` | underlying Wrangler admin failure | verify auth, permissions, and argument values |

Expected output:

- highest-confidence fix identified for current failure code

## Step 3: Re-run Minimal Validation

```bash
better-cf generate
npm run dev
```

Expected output:

- failure is either resolved or narrowed to one remaining error path

<div class="dx-callout">
  <strong>Good to know:</strong> many queue issues are static-shape issues. Keeping queue config literal and exported prevents most discovery failures.
</div>

## Troubleshooting

### Parse or scanner file error

Check TypeScript syntax in queue files and confirm files are valid `.ts`/`.tsx` modules.

### Queue or binding name conflict

Rename queue exports so derived queue and binding names are unique.

### Admin commands fail intermittently

Retry with explicit queue names and check Wrangler status/auth outside the SDK wrapper.

## Next Steps

- Review canonical error payloads in [Error Reference](/reference/errors)
- Inspect command flags in [CLI Command Reference](/reference/cli-reference)
- Revisit queue declaration rules in [File Structure](/guides/file-structure)
