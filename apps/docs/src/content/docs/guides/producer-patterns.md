---
title: Use Producer Patterns
description: Send single messages, batches, and multi-job payloads with typed queue producers.
---

Use queue producer APIs intentionally so your send path stays typed and operationally predictable.

## What You Will Achieve

- send one message with `send(...)`
- send multiple messages with `sendBatch(...)`
- send to multi-job queue channels with job-specific producers

## Before You Start

- complete [Build Your First Queue](/guides/first-queue)
- have queue bindings available in `ctx.env`

## Step 1: Send a Single Message

```ts
await signupQueue.send(
  { env: ctx.env },
  { email: 'dev@example.com', userId: 'u_123' },
  { delay: '10s', contentType: 'json' }
);
```

Expected output:

- payload validates against queue `message` schema
- one message is enqueued to the queue binding

## Step 2: Send a Batch

```ts
await signupQueue.sendBatch(
  { env: ctx.env },
  [
    { data: { email: 'a@example.com', userId: 'u_a' } },
    { data: { email: 'b@example.com', userId: 'u_b' }, delay: '20s' }
  ],
  { contentType: 'json' }
);
```

Expected output:

- each batch entry can override `delay` and `contentType`
- batch-level options apply as defaults

## Step 3: Send in Multi-Job Mode

```ts
await jobsQueue.signup.send({ env: ctx.env }, { email: 'dev@example.com' });
await jobsQueue.invoice.send({ env: ctx.env }, { amount: 99 });
```

Expected output:

- each job producer enforces its own message schema
- consumers can route by job envelope internally

<div class="dx-callout">
  <strong>Good to know:</strong> if you call producer APIs before generated wiring sets queue bindings, runtime throws a binding initialization error. Run through the normal <code>better-cf dev</code>/<code>generate</code>/<code>deploy</code> flow.
</div>

## Troubleshooting

### `Queue binding not initialized`

Run generation/deploy flow first and ensure your worker entry is `.better-cf/entry.ts`.

### `Queue binding ... not found in env`

Verify generated binding name exists in runtime env and Wrangler queue producers list.

### Batch send validation issues

Confirm each `data` payload matches queue schema and optional overrides use supported duration/contentType values.

## Next Steps

- Pick consumer behavior in [Consumer Patterns](/guides/consumer-patterns)
- Tune retries and batching in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Review method contracts in [Queue SDK API](/api/queue)
