---
title: Why better-cf
description: Why this opinionated SDK exists and when to choose it over native Cloudflare queue wiring.
---

## Why This SDK Exists

Cloudflare Queues are powerful, but production teams usually end up rebuilding the same scaffolding:

- payload contract validation
- queue binding plumbing across worker entrypoints
- wrangler queue consumer mapping drift
- repetitive error shapes around queue workflows

`better-cf` exists to make those defaults first-class and repeatable.

## Design Principles

### Typed by default

Define queue messages with Zod and keep type information at the producer and consumer boundaries.

### Less manual wiring

Queue discovery + generated entry wrappers reduce copy/paste infrastructure code.

### Safer defaults

Configuration validation catches unsupported combinations early (for example, `http_pull` with worker processing handlers).

### DX over ceremony

The API surface is intentionally compact (`createSDK`, `defineQueue`, `defineWorker`, `testQueue`) so teams can onboard faster.

## What Opinionated Means Here

`better-cf` chooses conventions to avoid common sources of drift, but still maps to Cloudflare-native primitives.

- You can still reason in Wrangler terms.
- The SDK does not hide Cloudflare concepts.
- When native access is needed, you can still use Cloudflare APIs directly.

## When To Use Native Cloudflare Directly

Choose native Cloudflare queue workflows if you need:

- custom runtime behavior outside the SDK’s supported queue model
- direct integration with APIs not wrapped by this package
- a minimal abstraction surface for one-off scripts

For most app teams, the default tradeoff is: native primitives underneath, with a friendlier and more consistent day-to-day developer experience on top.
