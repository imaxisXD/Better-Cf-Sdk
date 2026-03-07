---
title: Errors, Retries, Idempotency
description: Handle queue retries, Durable Object failures, and idempotency boundaries in the next-gen better-cf surface.
---

The SDK keeps Cloudflare semantics visible instead of hiding them.

## Queue Delivery

Queue consumers are still at-least-once.

That means:

- duplicate delivery is possible
- `failure` hooks are for logging, metrics, and compensating behavior
- Durable Object mutations triggered from queues should be idempotent

## Durable Object Calls

Durable Object methods run against one object instance at a time, but that does not give you app-wide transactions.

- strong ordering is per object, not global
- cross-object workflows are orchestration, not transactions
- network side effects should stay explicit and idempotent

## Recommended Patterns

- use queue message IDs or request IDs as dedupe keys
- store “already processed” markers in Durable Object storage when handling external retries
- keep high-fan-in work sharded across many object keys
- recreate raw stubs if native Durable Object RPC throws and you suspect stub invalidation

## Failure Hooks

External queue consumers support `failure` on both `message(...)` and `batch(...)`.

```ts
export const emailQueueConsumer = emailQueue.message({
  handler: async () => {
    return;
  },
  failure: async (ctx, job, error) => {
    console.error(ctx.message.id, job, error);
  }
});
```

## Validation Failures

Queue payload validation happens before your handler runs.

If validation fails:

- the handler does not run
- `failure` receives the error
- the message is retried using queue retry settings
