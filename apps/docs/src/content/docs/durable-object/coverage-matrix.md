---
title: Coverage Matrix
description: Map official Cloudflare Durable Object concepts to better-cf builders or raw escape hatches.
---

This page is the contract for what the SDK covers directly and what stays intentionally raw.

| Cloudflare Durable Object area | better-cf surface | Notes |
| --- | --- | --- |
| Object namespace / class declaration | `sdk.defineDurableObject(...)` | Stable `name`, key schema, version metadata. |
| Public RPC methods | `room.fn(...)` | Generated on `ctx.api.room.methodName(key, args)`. |
| Internal-only methods | `room.internal(...)` | Generated on `ctx.api.$internal.room.methodName(key, args)`. |
| Constructor / init | `room.init(...)` | Wrapped with `blockConcurrencyWhile(...)`. |
| Custom HTTP handling | `room.fetch(...)` | Used when you need Durable Object-specific fetch behavior. |
| Alarms | `room.alarm(...)` | One Cloudflare alarm slot per object still applies. |
| WebSocket hibernation hooks | `room.websocket(...)` | Thin wrapper over connect/message/close/error + attachment hydration. |
| SQLite-backed storage | `ctx.storage`, `ctx.sql` | No custom ORM layer is added. |
| Generated env bindings | `.better-cf/types.d.ts` | Extends `BetterCfGeneratedBindings` and `BetterCfAutoEnv`. |
| Generated runtime client | `ctx.api` | JSDoc comes from declaration metadata. |
| `idFromName`, `idFromString`, `newUniqueId` | `ctx.api.room.$raw.*` | Use raw namespace methods directly. |
| `getByName`, `get(id, options)` | `ctx.api.room.$raw.*` | Covers location hints and raw stub access. |
| Data location / placement tuning | `$raw.get(id, options)` and `$raw.newUniqueId(options)` | Default SDK routing stays named-key based. |
| Migrations | generated Wrangler `migrations` + `.better-cf/durable-migrations.json` | SQLite-only in the new surface. |
| Error handling / retries | queue `failure` hooks + app-level idempotency | Queue retries remain Cloudflare-native. |

## Not Abstracted on Purpose

- cross-object transactions
- global reactivity
- custom storage ORM
- full placement orchestration policy
- higher-level realtime room abstractions beyond Cloudflare WebSocket hooks

When those are needed, use Cloudflare primitives directly through the raw escape hatches or your own runtime code.
