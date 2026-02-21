---
title: Env Typing Modes
description: Choose between generated auto-env inference and explicit app-owned Env typing in Queue SDK (Alpha).
---

Queue SDK (Alpha) supports two ways to type `ctx.env`.

## Auto Mode (Default)

```ts
import { createSDK } from 'better-cf/queue';

export const { defineQueue, defineWorker } = createSDK();
```

In auto mode, generated env declarations come from `.better-cf/auto-env.d.ts`.

Use this when:

- you want quick setup and minimal type boilerplate
- queue bindings evolve frequently during early implementation
- your team prefers convention-first onboarding

## Explicit Mode (`createSDK<Env>()`)

```ts
import { createSDK } from 'better-cf/queue';

type Env = {
  DB: D1Database;
  RESEND_API_KEY: string;
  QUEUE_EMAIL: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
```

Use explicit mode when:

- your app has strict env ownership boundaries
- you want compile-time control over every env binding
- multiple teams share worker code and need predictable contracts

## Suggested Strategy

1. start with auto mode to iterate faster
2. move to explicit mode once bindings stabilize
3. keep generated flow (`dev/generate/deploy`) in place either way

## Quick Comparison

| Concern | Auto mode | Explicit mode |
|---|---|---|
| Setup speed | Fastest | Slightly more setup |
| Type strictness | Inferred/generated | Fully app-defined |
| Refactor safety | Good | Highest |
| Best for | Early iteration | Mature production codebases |
