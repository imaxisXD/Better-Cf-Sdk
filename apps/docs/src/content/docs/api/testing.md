---
title: Testing API
description: Run queue handlers in tests without Cloudflare runtime bootstrap.
---

Import from `better-cf/testing`.

```ts
import { testQueue } from 'better-cf/testing';
```

## `testQueue(handle, options)`

```ts
const result = await testQueue(signupQueue, {
  env: { QUEUE_SIGNUP: {} as Queue },
  message: { email: 'dev@example.com' }
});
```

### Options

- `env`: typed env object passed to queue consumer context
- `message`: single payload
- `messages`: batch payloads
- `attempts`: optional attempts number override

You must provide either `message` or `messages`.

### Result

```ts
type TestQueueResult<TMessage> = {
  acked: TMessage[];
  retried: TMessage[];
};
```

## Single-message Assertion Example

```ts
const result = await testQueue(signupQueue, {
  env: {},
  message: { email: 'dev@example.com' }
});

expect(result.acked).toEqual([{ email: 'dev@example.com' }]);
expect(result.retried).toEqual([]);
```

## Batch Assertion Example

```ts
const result = await testQueue(auditQueue, {
  env: {},
  messages: [{ action: 'created' }, { action: 'deleted' }]
});

expect(result.acked).toHaveLength(2);
```

## Retry-path Assertion Example

```ts
const result = await testQueue(retryQueue, {
  env: {},
  message: { id: 'task-1' },
  attempts: 3
});

expect(result.retried).toContainEqual({ id: 'task-1' });
```

`testQueue` is best for queue behavior unit tests; combine it with integration tests for full Worker runtime validation.
