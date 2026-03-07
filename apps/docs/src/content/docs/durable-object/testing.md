---
title: Testing
description: Test next-gen better-cf Durable Object methods and external queue consumers without full Cloudflare runtime bootstrap.
---

The testing helpers now cover both the legacy queue surface and the next-gen durable-object surface.

## Durable Function Tests

Use `testDurableFunction(...)` to execute one `room.fn(...)` or `room.internal(...)` registration with in-memory storage.

```ts
import { testDurableFunction } from 'better-cf/testing';

const result = await testDurableFunction(sendMessage, {
  env: {},
  args: {
    body: 'hello',
    author: 'abhi'
  }
});
```

## External Queue Consumer Tests

Use `testQueueConsumer(...)` for `queue.message(...)` and `queue.batch(...)`.

```ts
import { testQueueConsumer } from 'better-cf/testing';

await testQueueConsumer(emailQueue, emailQueueConsumer, {
  env: {},
  api: {
    room: {
      sendMessage: async () => ({ ok: true })
    }
  },
  message: {
    roomId: 'general',
    to: 'team@example.com',
    body: 'hello'
  }
});
```

## What the Test Helpers Provide

- synthetic queue batch metadata
- in-memory Durable Object storage
- generated `ctx.api` injection via the optional `api` field
- ack/retry visibility for queue assertions

## Still Available

Legacy inline queues continue to use `testQueue(...)`.

```ts
const result = await testQueue(signupQueue, {
  env: {},
  message: { email: 'dev@example.com' }
});
```
