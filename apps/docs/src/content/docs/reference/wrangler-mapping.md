---
title: Wrangler Mapping
description: How Queue SDK (Alpha) config maps to Wrangler queue producers and consumers.
---

Queue SDK (Alpha) generates queue sections in supported Wrangler configs from discovered queue definitions.

## Producer Mapping

| better-cf key | Wrangler key | Notes |
|---|---|---|
| `deliveryDelay` | `delivery_delay` | Duration is converted to seconds (`30s`, `5m`, `1h`, or number). |

## Consumer Mapping

| better-cf key | Wrangler key | Applies to |
|---|---|---|
| `retry` | `max_retries` | worker + `http_pull` |
| `retryDelay` | `retry_delay` | worker + `http_pull` |
| `deadLetter` | `dead_letter_queue` | worker + `http_pull` |
| `batch.maxSize` | `max_batch_size` | worker consumer |
| `batch.timeout` | `max_batch_timeout` | worker consumer |
| `batch.maxConcurrency` | `max_concurrency` | worker consumer |
| `consumer.type = "http_pull"` | `type = "http_pull"` | pull consumer |
| `consumer.visibilityTimeout` | `visibility_timeout_ms` | pull consumer |
| top-level `visibilityTimeout` | `visibility_timeout_ms` | pull consumer (if used) |

## File Formats

Supported Wrangler config targets:

- `wrangler.toml`
- `wrangler.jsonc`

The CLI ensures `main = ".better-cf/entry.ts"` and keeps managed queue sections synchronized.

## Duration Rules

Accepted duration formats:

- number (seconds)
- string in `s`, `m`, or `h` units (for example `30s`, `5m`, `1h`)

Invalid values fail with `INVALID_DURATION`.
