---
title: Identity + Migrations
description: Design Durable Object keys, understand placement, and keep SQLite-backed migrations stable in better-cf.
---

Durable Object design starts with identity.

## `name` vs Runtime Key

- `name` in `defineDurableObject(...)` is the class/namespace identity
- the runtime key in `ctx.api.room.sendMessage(key, args)` picks one object instance inside that namespace

Example:

- `Room` is the Durable Object type
- `'general'` is one room instance
- `'support'` is another room instance

## Key Design

Pick keys around the atom of coordination:

- `room:general`
- `user:123`
- `cart:abc`
- `org:42:project:7`

The default better-cf path is named-key routing. That lines up with Cloudflare `idFromName(...)` and keeps generated client ergonomics simple.

## Placement and Raw Escape Hatches

The generated client includes `$raw` when you need Cloudflare namespace control directly:

- `ctx.api.room.$raw.idFromName(key)`
- `ctx.api.room.$raw.idFromString(id)`
- `ctx.api.room.$raw.newUniqueId(options)`
- `ctx.api.room.$raw.getByName(key)`
- `ctx.api.room.$raw.get(id, options)`

Use the raw surface for location hints, jurisdiction, raw stubs, or unique-ID flows that sit outside the default named-key path.

## SQLite Migrations

The new surface assumes SQLite-backed Durable Objects only.

`better-cf generate` will:

- patch `[[durable_objects.bindings]]`
- maintain managed `[[migrations]]` with `new_sqlite_classes`
- persist migration state in `.better-cf/durable-migrations.json`

## Stability Rules

- keep `name` stable once deployed
- treat renames as migrations, not refactors
- keep keys stable for the lifetime of the object’s data model
- use versioning and explicit storage upgrades when object schema changes
