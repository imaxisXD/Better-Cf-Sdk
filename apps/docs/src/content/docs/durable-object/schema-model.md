---
title: schema.ts Model
description: Understand why schema.ts is the resource registry for better-cf Durable Objects and queues.
---

`schema.ts` is the static graph of your Cloudflare resources.

## What Belongs Here

- `sdk.defineDurableObject(...)`
- `sdk.defineQueue(...)`
- `sdk.defineQueues(...)`

## What Does Not Belong Here

- business logic bodies
- queue consumer implementations
- Durable Object method implementations

Keep runtime behavior in sibling files and import declarations from `schema.ts`.

## Example

```ts
import { z } from 'zod';
import { sdk } from '../better-cf.config';

export const room = sdk.defineDurableObject({
  name: 'Room',
  key: z.string(),
  version: 1,
  description: 'Chat room state.'
});

export const emailQueue = sdk.defineQueue({
  args: z.object({
    roomId: z.string(),
    to: z.string().email(),
    body: z.string()
  }),
  retry: 3
});
```

## Why This Split Matters

- codegen can discover resources deterministically
- generated `ctx.api` stays stable
- Wrangler bindings and migrations can be inferred without duplicate config
- queue + Durable Object composition is obvious from one file

## Durable Object Identity

`defineDurableObject(...)` declares the Durable Object type, not one instance.

- `name` is the Cloudflare class/namespace identity and must stay stable
- `key` validates the app-level key you use at runtime
- the actual object instance is chosen when you call `ctx.api.room.sendMessage(key, args)`

## Escape Hatches

The generated client also exposes `$raw` on each Durable Object so you can reach native namespace methods:

- `namespace()`
- `idFromName(key)`
- `idFromString(id)`
- `newUniqueId(options)`
- `getByName(key)`
- `get(id, options)`

Use `$raw` when you need location hints, jurisdiction, direct stub access, or custom routing that sits below the default named-key flow.
