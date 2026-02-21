---
title: Queue SDK API Reference
description: Signatures, parameters, return shapes, examples, and constraints for better-cf/queue.
---

This page documents the runtime API surface for queue and worker definitions.

## What You Will Achieve

- understand exact signatures for `createSDK`, `defineQueue`, and `defineWorker`
- choose the right queue shape for push, batch, pull, or multi-job use cases
- apply producer APIs with correct message and option types

## Before You Start

- import APIs from `better-cf/queue`
- understand queue declaration discovery rules from [File Structure](/guides/file-structure)

## Canonical Import

```ts
import { createSDK } from 'better-cf/queue';
```

## Step 1: Create SDK Helpers

### Signature

```ts
createSDK<E extends Record<string, unknown> = BetterCfAutoEnv>(): {
  defineQueue: ...
  defineWorker: ...
}
```

### Parameters

- `E` (optional generic): app env type

### Returns

- `defineQueue`: queue definition factory
- `defineWorker`: worker definition factory

### Example

```ts
type Env = {
  QUEUE_SIGNUP: Queue;
  DB: D1Database;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
```

## Step 2: Define a Push Queue (`process`)

### Signature (single-message push mode)

```ts
defineQueue({
  message,
  process,
  onFailure?,
  retry?,
  retryDelay?,
  deadLetter?,
  deliveryDelay?,
  batch?,
  consumer?: { type?: 'worker' }
})
```

### Returns

```ts
QueueHandle<E, Message>
```

### Example

```ts
const signupQueue = defineQueue({
  message: z.object({ email: z.string().email() }),
  retry: 3,
  retryDelay: '30s',
  process: async (ctx, message) => {
    console.log(ctx.message.id, message.email);
  },
  onFailure: async (ctx, message, error) => {
    console.error(error.message, message);
  }
});
```

## Step 3: Define a Batch Queue (`processBatch`)

### Signature (batch push mode)

```ts
defineQueue({
  message,
  processBatch,
  onFailure?,
  batch?: { maxSize?, timeout?, maxConcurrency? },
  retry?,
  retryDelay?,
  deadLetter?,
  deliveryDelay?,
  consumer?: { type?: 'worker' }
})
```

### Returns

```ts
QueueHandle<E, Message>
```

### Example

```ts
const auditQueue = defineQueue({
  message: z.object({ action: z.string() }),
  batch: { maxSize: 10, timeout: '30s', maxConcurrency: 2 },
  processBatch: async (ctx, messages) => {
    console.log(messages.length, ctx.batch.queue);
    ctx.batch.ackAll();
  }
});
```

## Step 4: Define an HTTP Pull Queue (`consumer.type = "http_pull"`)

### Signature (pull mode)

```ts
defineQueue({
  message,
  consumer: { type: 'http_pull', visibilityTimeout? },
  retry?,
  retryDelay?,
  deadLetter?,
  deliveryDelay?
})
```

### Returns

```ts
QueueHandle<E, Message>
```

### Example

```ts
const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 5,
  deadLetter: 'pull-dlq'
});
```

## Step 5: Define a Multi-Job Queue

### Signature

```ts
defineQueue({
  retry?,
  retryDelay?,
  deadLetter?,
  deliveryDelay?,
  batch?,
  <jobName>: {
    message,
    process,
    onFailure?
  }
})
```

### Returns

```ts
MultiJobQueueHandle<E, Jobs>
```

### Example

```ts
const jobsQueue = defineQueue({
  retry: 2,
  signup: {
    message: z.object({ email: z.string().email() }),
    process: async (ctx, message) => {
      console.log(ctx.message.id, message.email);
    }
  },
  invoice: {
    message: z.object({ amount: z.number() }),
    process: async (ctx, message) => {
      console.log(ctx.message.id, message.amount);
    }
  }
});
```

## Step 6: Use Producer APIs

### `send(ctx, data, options?)`

```ts
await signupQueue.send(
  { env: ctx.env },
  { email: 'dev@example.com' },
  { delay: '10s', contentType: 'json' }
);
```

### `sendBatch(ctx, messages, options?)`

```ts
await signupQueue.sendBatch(
  { env: ctx.env },
  [
    { data: { email: 'a@example.com' } },
    { data: { email: 'b@example.com' }, delay: '30s' }
  ],
  { contentType: 'json' }
);
```

### Producer Return Type

- both methods return `Promise<void>`

## Step 7: Define Worker Runtime Entry

### Signature

```ts
defineWorker({
  fetch(request, ctx): Promise<Response>,
  scheduled?(event, ctx): Promise<void>
})
```

### Returns

- module worker-compatible export with `fetch` and optional `scheduled`

### Example

```ts
export default defineWorker({
  async fetch(request, ctx) {
    console.log(ctx.env);
    return new Response(request.method);
  },
  async scheduled(event, ctx) {
    console.log(event.cron, ctx.env);
  }
});
```

<div class="dx-callout">
  <strong>Good to know:</strong> queue config fails fast for invalid combinations. Example: both <code>process</code> and <code>processBatch</code>, push handlers in pull mode, or zero-job multi-queue definitions.
</div>

## Constraints

- push mode requires exactly one of `process` or `processBatch`
- pull mode cannot include `process`, `processBatch`, or `onFailure`
- multi-job mode requires at least one job object
- queue binding injection depends on generated wiring (`dev`, `generate`, or `deploy` flow)

## Troubleshooting

### Producer throws `Queue binding not initialized`

Run through generation/deploy flow so bindings are set in generated entry.

### Invalid queue shape errors

Check constraints above and validate queue declaration mode.

### Env typing mismatch

Use explicit `createSDK<Env>()` or align generated auto-env artifacts.

## Next Steps

- Test queue handlers in [Queue SDK Testing API](/api/testing)
- Tune queue behavior in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Inspect mapping output in [Wrangler Mapping](/reference/wrangler-mapping)
