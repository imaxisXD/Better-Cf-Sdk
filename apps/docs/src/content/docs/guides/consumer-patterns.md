---
title: Choose Consumer Patterns
description: Implement push consumers with handler/batchHandler and failure handling patterns.
---

Choose the right queue consumer shape for throughput, ordering, and retry behavior.

## What You Will Achieve

- implement single-message consumption with `handler`
- implement batch consumption with `batchHandler`
- attach `onFailure` for explicit failure side-effects

## Before You Start

- complete [Build Your First Queue](/guides/first-queue)
- decide whether workload is item-by-item or batch-oriented

## Step 1: Use `handler` for Per-Message Control

```ts
export const signupQueue = defineQueue({
  args: z.object({ email: z.string().email() }),
  handler: async (ctx, args) => {
    console.log(ctx.message.id, ctx.message.attempts, args.email);
  },
  onFailure: async (ctx, args, error) => {
    console.error('signup failed', error.message, args);
  }
});
```

Expected output:

- handler runs once per message
- `ctx.message` includes `id`, `attempts`, `queue`, and timestamp metadata

## Step 2: Use `batchHandler` for Throughput

```ts
export const auditQueue = defineQueue({
  args: z.object({ action: z.string() }),
  batch: { maxSize: 10, timeout: '30s', maxConcurrency: 2 },
  batchHandler: async (ctx, messages) => {
    console.log(messages.length, ctx.batch.queue);
    ctx.batch.ackAll();
  }
});
```

Expected output:

- messages are delivered to one batch callback
- batch metadata and ack/retry helpers are available via `ctx.batch`

## Step 3: Keep Consumer Mode Valid

- choose exactly one of `handler` or `batchHandler`
- use `consumer.type = 'http_pull'` only for pull workflows (no push handlers)

Expected output:

- discovery/generation pipeline runs without queue config errors

<div class="dx-callout">
  <strong>Good to know:</strong> defining both <code>handler</code> and <code>batchHandler</code> fails fast in queue definition validation.
</div>

## Troubleshooting

### `Queue config cannot define both handler and batchHandler`

Remove one handler mode and keep only the intended consumer shape.

### `Queue config must define one of handler or batchHandler`

In push mode, add one handler. In pull mode, set `consumer.type = 'http_pull'` and remove handlers.

### High retry volume with batch mode

Lower batch size/concurrency and inspect failure handling behavior before raising throughput settings.

## Next Steps

- Configure pull mode in [HTTP Pull Consumers](/guides/http-pull-consumers)
- Tune reliability in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Validate behavior with [Queue SDK Testing API](/api/testing)
