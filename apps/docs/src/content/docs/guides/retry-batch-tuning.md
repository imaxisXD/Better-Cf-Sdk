---
title: Tune Retry, DLQ, and Batch Settings
description: Configure retry behavior, dead-letter routing, and batch controls for stable queue operations.
---

Tune delivery settings so retry behavior and throughput match your workload and failure profile.

## What You Will Achieve

- configure `retry`, `retryDelay`, and `deadLetter`
- tune `batch.maxSize`, `batch.timeout`, and `batch.maxConcurrency`
- verify generated Wrangler queue consumer settings

## Before You Start

- complete [Choose Consumer Patterns](/guides/consumer-patterns)
- know your failure tolerance and processing latency targets

## Step 1: Set Retry and Dead-Letter Defaults

```ts
export const emailQueue = defineQueue({
  args: z.object({ to: z.string().email() }),
  retry: 5,
  retryDelay: '20s',
  deadLetter: 'email-failed',
  handler: async (ctx, message) => {
    console.log(ctx.message.attempts, message.to);
  }
});
```

Expected output:

- retries and DLQ routing are captured in generated Wrangler consumer config

## Step 2: Tune Batch Controls for Push Consumers

```ts
batch: {
  maxSize: 20,
  timeout: '30s',
  maxConcurrency: 4
}
```

Expected output:

- consumer receives bounded batch sizes
- concurrency remains explicit and reviewable in queue config

## Step 3: Verify Generated Mapping

Run:

```bash
npx better-cf generate
```

Expected output:

- Wrangler queue sections include retry, retry delay, dead letter, and batch mappings
- no static extraction diagnostics for these keys

<div class="dx-callout">
  <strong>Good to know:</strong> keep tuning values as literals where possible. Deeply computed config values can reduce static extraction accuracy for generated mapping.
</div>

## Troubleshooting

### Retry settings not reflected in Wrangler config

Use literal values for queue config keys and rerun generation.

### Consumer throughput unstable

Lower `maxConcurrency` and `maxSize`, then raise gradually with production metrics.

### Dead-letter queue behavior unexpected

Confirm DLQ name exists and consumer mode configuration matches intended push/pull flow.

## Next Steps

- Validate mapping details in [Wrangler Mapping](/reference/wrangler-mapping)
- Operate queue resources via [Queue Admin CLI](/guides/queue-admin-cli)
- Prepare release checks in [Production Checklist](/guides/production-checklist)
