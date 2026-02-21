---
title: Choose Consumer Patterns
description: Implement push consumers with process/processBatch and failure handling patterns.
---

Choose the right queue consumer shape for throughput, ordering, and retry behavior.

## What You Will Achieve

- implement single-message consumption with `process`
- implement batch consumption with `processBatch`
- attach `onFailure` for explicit failure side-effects

## Before You Start

- complete [Build Your First Queue](/guides/first-queue)
- decide whether workload is item-by-item or batch-oriented

## Step 1: Use `process` for Per-Message Control

```ts
export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  process: async (ctx, message) => {
    console.log(ctx.message.id, ctx.message.attempts, message.email);
  },
  onFailure: async (ctx, message, error) => {
    console.error('signup failed', error.message, message);
  }
});
```

Expected output:

- handler runs once per message
- `ctx.message` includes `id`, `attempts`, `queue`, and timestamp metadata

## Step 2: Use `processBatch` for Throughput

```ts
export const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  batch: { maxSize: 10, timeout: '30s', maxConcurrency: 2 },
  processBatch: async (ctx, messages) => {
    console.log(messages.length, ctx.batch.queue);
    ctx.batch.ackAll();
  }
});
```

Expected output:

- messages are delivered to one batch callback
- batch metadata and ack/retry helpers are available via `ctx.batch`

## Step 3: Keep Consumer Mode Valid

- choose exactly one of `process` or `processBatch`
- use `consumer.type = 'http_pull'` only for pull workflows (no push handlers)

Expected output:

- discovery/generation pipeline runs without queue config errors

<div class="dx-callout">
  <strong>Good to know:</strong> defining both <code>process</code> and <code>processBatch</code> fails fast in queue definition validation.
</div>

## Troubleshooting

### `Queue config cannot define both process and processBatch`

Remove one handler mode and keep only the intended consumer shape.

### `Queue config must define one of process or processBatch`

In push mode, add one handler. In pull mode, set `consumer.type = 'http_pull'` and remove handlers.

### High retry volume with batch mode

Lower batch size/concurrency and inspect failure handling behavior before raising throughput settings.

## Next Steps

- Configure pull mode in [HTTP Pull Consumers](/guides/http-pull-consumers)
- Tune reliability in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Validate behavior with [Queue SDK Testing API](/api/testing)
