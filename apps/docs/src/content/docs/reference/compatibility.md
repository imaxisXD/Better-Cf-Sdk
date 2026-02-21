---
title: Compatibility
description: Runtime, tooling, and config compatibility matrix for Queue SDK (Alpha).
---

This compatibility matrix applies to Queue SDK (Alpha), the currently shipped package in the better-cf SDK suite.

## Supported Versions

| Surface | Support |
|---|---|
| Node.js | `>=18.18` |
| Wrangler | `>=3.91.0 <5` (v3 and v4) |
| TypeScript | supported (project-level, user-managed) |

## Supported Config Targets

- `wrangler.toml`
- `wrangler.jsonc`

## Runtime and Worker Modes

- module workers: primary and recommended mode
- legacy service-worker adapter: compatibility mode only

## Queue Consumer Modes

- worker consumer mode (`process` / `processBatch`)
- `http_pull` configuration mode (no in-worker pull runtime abstraction)

## Framework Compatibility

- Hono is supported and works with generated entry wrappers

## Notes

- `better-cf dev --remote` is intentionally unsupported for queue local workflow
- Generated entry and env typing are part of normal operation (`.better-cf/*`)
