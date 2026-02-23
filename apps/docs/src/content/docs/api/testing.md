---
title: Queue SDK Testing API
description: Reference for testQueue and queue handler unit-testing workflows without Cloudflare runtime bootstrap.
---

Test queue behavior directly with deterministic inputs and assertions.

## What You Will Achieve

- run queue handlers in unit tests without booting Worker runtime
- provide single-message or batch test payloads
- assert acked vs retried outcomes from one helper call

## Before You Start

- import `testQueue` from `better-cf/testing`
- have a queue handle created with `defineQueue(...)`
- have test runtime set up (for example Vitest)

## Step 1: Import and Call `testQueue`

```ts
import { testQueue } from 'better-cf/testing';

const result = await testQueue(signupQueue, {
  env: { QUEUE_SIGNUP: {} as Queue },
  message: { email: 'dev@example.com' }
});
```

Expected output:

- queue consumer logic runs against your provided test payload
- helper returns a result object with processing outcome arrays

## Step 2: Use Valid Options

`testQueue(handle, options)` supports:

- `env` (required): env object passed to queue consumer context
- `message` (optional): one payload
- `messages` (optional): many payloads
- `attempts` (optional): attempts count override for test message metadata

Expected output:

- exactly one of `message` or `messages` is provided

## Step 3: Assert Result Shape

```ts
type TestQueueResult<TMessage> = {
  acked: TMessage[];
  retried: TMessage[];
};
```

Example assertions:

```ts
expect(result.acked).toEqual([{ email: 'dev@example.com' }]);
expect(result.retried).toEqual([]);
```

<div class="dx-callout">
  <strong>Good to know:</strong> if you omit both <code>message</code> and <code>messages</code>, <code>testQueue</code> throws immediately.
</div>

## Troubleshooting

### `testQueue requires message or messages`

Provide either `message` or `messages` in options.

### Unexpected retries in result

Check handler logic for explicit retry paths and verify `attempts` value used in test setup.

### Type mismatch in test payload

Align payload shape with queue `args` schema used in `defineQueue(...)`.

## Next Steps

- Review queue runtime APIs in [Queue SDK API Reference](/api/queue)
- Build higher-level patterns in [Producer Patterns](/guides/producer-patterns)
- Add failure path tests with [Troubleshooting](/guides/troubleshooting)
