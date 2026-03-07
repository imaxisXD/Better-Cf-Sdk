---
title: Alarms, Fetch, WebSockets
description: Map Cloudflare Durable Object lifecycle hooks to better-cf builders without hiding the underlying runtime.
---

The Durable Object surface includes thin builders for the main lifecycle hooks outside public RPC methods.

## `room.init(...)`

Use `room.init(...)` for constructor-time setup that should run inside `blockConcurrencyWhile(...)`.

```ts
export const roomInit = room.init({
  handler: async ({ storage }) => {
    if (!(await storage.get('messages'))) {
      await storage.put('messages', []);
    }
  }
});
```

## `room.fetch(...)`

Use `room.fetch(...)` when the Durable Object needs custom HTTP behavior.

```ts
export const roomFetch = room.fetch({
  handler: async ({ request }) => {
    return new Response(new URL(request.url).pathname);
  }
});
```

## `room.alarm(...)`

Use `room.alarm(...)` for per-object scheduling on top of Cloudflare alarms.

```ts
export const roomAlarm = room.alarm({
  handler: async ({ storage }) => {
    await storage.put('last-alarm', Date.now());
  }
});
```

There is still only one Cloudflare alarm slot per object. If you want multiple logical jobs, persist your own schedule state in storage and multiplex inside the alarm handler.

## `room.websocket(...)`

Use `room.websocket(...)` as a thin wrapper over Cloudflare WebSocket hibernation hooks.

```ts
export const roomSocket = room.websocket<{ roomId: string }>({
  connect: async ({ accept }) => {
    accept({ tags: ['room'], attachment: { roomId: 'general' } });
  },
  message: async ({ attachment, socket }, message) => {
    socket.send(JSON.stringify({ attachment, message }));
  }
});
```

Supported callbacks:

- `connect`
- `message`
- `close`
- `error`
- `serializeAttachment`
- `hydrateAttachment`

## Precedence

- one `init` per Durable Object
- one `fetch` per Durable Object
- one `alarm` per Durable Object
- one `websocket` registration per Durable Object
- many `fn` and `internal` methods per Durable Object

For upgrade requests, generated code routes to `room.websocket(...)` first. If no websocket builder exists, it falls back to `room.fetch(...)`.
