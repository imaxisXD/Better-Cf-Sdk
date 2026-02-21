---
title: Wrangler Mapping Reference
description: Map Queue SDK config keys to Wrangler queue producer and consumer settings.
---

Use this reference to verify how Queue SDK queue config fields are translated into Wrangler config.

## What You Will Achieve

- map Queue SDK producer/consumer keys to Wrangler keys
- verify supported config targets and duration rules
- debug mapping mismatches with deterministic key translation

## Before You Start

- queue declarations defined with `defineQueue(...)`
- generated workflow run at least once (`better-cf generate`)
- familiarity with Wrangler config format used by your app

## Step 1: Map Producer Keys

| Queue SDK key | Wrangler key | Notes |
|---|---|---|
| `deliveryDelay` | `delivery_delay` | duration converted to seconds (`30s`, `5m`, `1h`, or number) |

Expected output:

- producer queue bindings include translated delivery delay where configured

## Step 2: Map Consumer Keys

| Queue SDK key | Wrangler key | Applies to |
|---|---|---|
| `retry` | `max_retries` | worker + `http_pull` |
| `retryDelay` | `retry_delay` | worker + `http_pull` |
| `deadLetter` | `dead_letter_queue` | worker + `http_pull` |
| `batch.maxSize` | `max_batch_size` | worker consumer |
| `batch.timeout` | `max_batch_timeout` | worker consumer |
| `batch.maxConcurrency` | `max_concurrency` | worker consumer |
| `consumer.type = "http_pull"` | `type = "http_pull"` | pull consumer |
| `consumer.visibilityTimeout` | `visibility_timeout_ms` | pull consumer |
| top-level `visibilityTimeout` | `visibility_timeout_ms` | pull consumer fallback |

Expected output:

- queue consumer sections in Wrangler mirror declaration intent

## Step 3: Verify Target Format and Duration Rules

Supported Wrangler targets:

- `wrangler.toml`
- `wrangler.jsonc`

Duration inputs accepted by SDK mapping:

- integer number (seconds)
- duration string with `s`, `m`, or `h` suffix

Expected output:

- invalid duration values fail fast with `INVALID_DURATION`

<div class="dx-callout">
  <strong>Good to know:</strong> generation enforces <code>main = ".better-cf/entry.ts"</code> and keeps managed queue sections synchronized.
</div>

## Troubleshooting

### Config key not appearing in Wrangler output

Use literal values for mapped keys and rerun generation.

### Unexpected value conversion

Check duration format and confirm unit suffix (`s`, `m`, `h`) is valid.

### Mapping differs across environments

Verify the same queue declarations and generation command are used per environment.

## Next Steps

- See pipeline internals in [Discovery and Codegen](/architecture/discovery-and-codegen)
- Resolve config errors in [Error Reference](/reference/errors)
- Harden delivery behavior in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
