---
title: Compatibility Reference
description: Supported runtime, tooling, worker mode, and config targets for Queue SDK.
---

Use this matrix to verify whether your environment is within supported Queue SDK boundaries.

## What You Will Achieve

- confirm supported Node/Wrangler baseline versions
- validate supported worker/config modes for your deployment model
- identify unsupported combinations before integration or migration

## Before You Start

- know your project’s Node and Wrangler versions
- know whether you run module-worker or legacy compatibility mode
- know whether queues are push or `http_pull` configured

## Step 1: Validate Core Version Support

| Surface | Support |
|---|---|
| Node.js | `>=18.18` |
| Wrangler | `>=3.91.0 <5` |
| TypeScript | supported (project-level, user-managed) |

Expected output:

- toolchain aligns with supported Queue SDK range

## Step 2: Validate Config and Runtime Modes

Supported config targets:

- `wrangler.toml`
- `wrangler.jsonc`

Supported runtime modes:

- module workers (primary, recommended)
- legacy service-worker adapter (compatibility-only)

Expected output:

- chosen worker/config mode aligns with intended project stage

## Step 3: Validate Queue Consumer and Framework Scope

Supported queue consumer modes:

- worker consumer mode (`handler` / `batchHandler`)
- `http_pull` configuration mode (no in-worker pull runtime abstraction)

Framework note:

- Hono integration is supported with generated entry flow

Expected output:

- consumer strategy and framework usage fit documented compatibility surface

<div class="dx-callout">
  <strong>Good to know:</strong> <code>better-cf dev --remote</code> is intentionally unsupported for queue local workflow.
</div>

## Troubleshooting

### Tooling versions look close but fail

Pin exact supported ranges for Node and Wrangler, then rerun generation.

### Legacy mode used in new projects

Use module-worker defaults and reserve legacy mode for migration paths only.

### Pull consumer expectations mismatch

Treat `http_pull` as configuration/admin mode and implement pull runtime handling outside this SDK abstraction.

## Next Steps

- Review migration path in [Migrate from Legacy Service Worker Mode](/guides/legacy-cloudflare)
- Inspect queue mapping details in [Wrangler Mapping Reference](/reference/wrangler-mapping)
- Track known boundaries in [Limitations](/limitations)
