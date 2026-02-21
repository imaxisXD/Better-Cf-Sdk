---
title: Legacy Cloudflare Guide
description: Queue SDK (Alpha) compatibility mode for service-worker style exports.
---

Queue SDK (Alpha) is module-worker first. Legacy service-worker support exists only as a compatibility bridge.

## Enable Compatibility Mode

```ts
// better-cf.config.ts
export const betterCfConfig = {
  legacyServiceWorker: true
};
```

## What Changes

- generated entry includes compatibility handling for legacy export style
- runtime prints a compatibility warning so teams do not mistake this for parity mode
- module-worker architecture remains the recommended target

## Use This Mode When

- you are migrating an existing service-worker codebase incrementally
- you cannot switch worker export shape immediately

## Avoid This Mode for New Projects

For greenfield work, use module workers from day one.

## Migration Checklist

1. keep queue definitions and env typing in `better-cf` patterns
2. move worker exports to module-worker style (`export default { fetch }` or `defineWorker`)
3. disable `legacyServiceWorker` after migration
