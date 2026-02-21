---
title: Automation CLI
description: How the better-cf automation loop works in dev, generate, and deploy flows.
---

The CLI is built around one idea: keep queue wiring and Wrangler config synchronized automatically.

## Command Modes

### `better-cf dev`

Continuous mode for local development.

```bash
better-cf dev --port 8787
```

### `better-cf generate`

One-shot mode for CI and pre-deploy checks.

```bash
better-cf generate
```

## What `dev` Does on Each Cycle

1. scans project files for `defineQueue` exports
2. validates queue definitions and emits diagnostics
3. generates `.better-cf/entry.ts` and generated types
4. patches supported Wrangler config (`wrangler.toml` or `wrangler.jsonc`)
5. regenerates `.better-cf/auto-env.d.ts`
6. starts or restarts `wrangler dev`
7. repeats when relevant files change

## Useful Flags

```bash
better-cf dev --port 8788
better-cf dev --no-watch
```

- `--port`: passes through to `wrangler dev --port`
- `--no-watch`: runs initial build + dev server without file watching

## Remote Mode Constraint

`--remote` is intentionally blocked for queue development.

Cloudflare Queues local workflow in this SDK is local-runtime oriented. If you pass `--remote`, the CLI exits with `REMOTE_QUEUE_DEV_UNSUPPORTED`.

## Typical Workflow

1. run `better-cf dev` while building queue handlers
2. resolve diagnostics immediately when scanner errors appear
3. run `better-cf generate` in CI before deploy
4. run `better-cf deploy` for production release

<div class="dx-callout">
  <strong>DX tip:</strong> keep queue config mostly literal (instead of deeply computed objects) for the best static extraction and Wrangler patch accuracy.
</div>
