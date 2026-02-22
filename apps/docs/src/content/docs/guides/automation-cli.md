---
title: Run the Automation CLI Workflow
description: Understand how better-cf dev/generate/deploy automates queue discovery, codegen, and Wrangler sync.
---

Use the automation loop to keep queue declarations, generated files, and Wrangler config in sync.

## What You Will Achieve

- run the continuous local loop with `better-cf dev`
- run deterministic CI/predeploy generation with `better-cf generate`
- understand when and why generation is re-triggered

## Before You Start

- complete [Install Queue SDK and Tooling](/guides/installation)
- run `better-cf init` in an existing project or `better-cf create` for a new project
- define at least one exported queue declaration
- have Wrangler available in your workspace

## Step 1: Run Continuous Development Mode

```bash
better-cf dev --port 8787
```

Expected output:

- scanner detects queue definitions
- generated `.better-cf/*` artifacts are refreshed
- Wrangler config queue mapping is patched
- `wrangler dev` starts and restarts on relevant changes

## Step 2: Run One-shot Generation Mode

```bash
better-cf generate
```

Expected output:

- queue discovery diagnostics are printed
- `.better-cf/entry.ts` and env type artifacts are regenerated
- no runtime server process is started

## Step 3: Understand Useful Flags

```bash
better-cf dev --port 8788
better-cf dev --no-watch
```

- `--port`: pass-through to `wrangler dev --port`
- `--no-watch`: run initial generation + dev startup without file watch loop

Expected output:

- local loop behavior matches the chosen development mode

<div class="dx-callout">
  <strong>Good to know:</strong> <code>better-cf dev --remote</code> is intentionally blocked for queue workflow and exits with <code>REMOTE_QUEUE_DEV_UNSUPPORTED</code>.
</div>

## Troubleshooting

### Queue changes are not reflected

Re-run `better-cf generate` and confirm queue declarations are exported from files imported via `better-cf.config`.

### Frequent regen churn

Keep queue config mostly literal and reduce dynamic config construction in declaration files.

### Dev works but deploy fails

Run `better-cf generate` in CI before deploy and inspect diagnostics as a preflight gate.

## Next Steps

- Learn command flags in [CLI Command Reference](/reference/cli-reference)
- Operate queue resources via [Queue Admin CLI](/guides/queue-admin-cli)
- Inspect architecture flow in [Discovery and Codegen](/architecture/discovery-and-codegen)
