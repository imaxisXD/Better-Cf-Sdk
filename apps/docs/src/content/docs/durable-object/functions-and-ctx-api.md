---
title: Functions + ctx.api
description: Define Durable Object methods with room.fn and call them through generated ctx.api clients.
---

Durable Object behavior is declared on the resource handle and invoked through generated clients.

## Public Methods

```ts
import { z } from 'zod';
import { room } from './schema';

export const sendMessage = room.fn({
  description: 'Append a room message.',
  args: z.object({
    body: z.string(),
    author: z.string()
  }),
  returns: z.object({
    ok: z.literal(true)
  }),
  handler: async ({ storage }, args) => {
    const messages = ((await storage.get('messages')) as unknown[] | undefined) ?? [];
    messages.push(args);
    await storage.put('messages', messages);
    return { ok: true };
  }
});
```

Runtime calls:

```ts
await ctx.api.room.sendMessage('general', {
  body: 'hello',
  author: 'abhi'
});
```

## Internal Methods

Use `room.internal(...)` for methods that should not appear on the public client namespace.

```ts
export const markEmailSent = room.internal({
  args: z.object({
    to: z.string().email()
  }),
  handler: async ({ storage }, args) => {
    await storage.put(`email:${args.to}`, true);
    return null;
  }
});
```

Runtime calls:

```ts
await ctx.api.$internal.room.markEmailSent('general', {
  to: 'team@example.com'
});
```

## What the Handler Receives

`room.fn(...)` and `room.internal(...)` handlers receive thin Cloudflare-native context:

- `ctx.env`
- `ctx.executionCtx`
- `ctx.api`
- `ctx.state`
- `ctx.storage`
- `ctx.sql`

The SDK does not hide Durable Object storage or invent a higher-level ORM.

## JSDoc and Client Ergonomics

Descriptions attached to the declaration become JSDoc on generated `ctx.api` methods in `.better-cf/types.d.ts`.

That is why the method description belongs on the builder itself instead of in a separate registry.
