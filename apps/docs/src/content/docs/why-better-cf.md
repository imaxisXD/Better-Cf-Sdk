---
title: Why better-cf
description: Why this SDK suite exists, why Queue SDK ships first in Alpha, and how the functional-style DX model guides the roadmap.
---

## Why This Suite Exists

Cloudflare gives strong primitives. The gap is not capability, it is developer workflow.

Across teams, we repeatedly saw the same friction:

- payload contracts enforced by convention instead of first-class typed APIs
- queue and worker wiring duplicated across entrypoints and config files
- manual Wrangler synchronization that drifts over time
- inconsistent error and test harness patterns across services

better-cf exists to make those defaults systematic, not ad hoc.

## The Product Thesis

This is the same pattern shift React went through when functional composition won over class-heavy patterns:

- less ceremony per feature
- clearer composition boundaries
- tighter feedback loops for everyday development

Cloudflare remains the runtime foundation. The SDK layer focuses on modern functional ergonomics on top.

## What "Modern DX" Means Here

The bar is set by SDKs and platforms like Convex, Vercel, Clerk, Upstash, and TanStack Query:

- typed APIs as the default, not optional add-ons
- predictable automation loops for daily work
- opinionated conventions that reduce integration drift
- escape hatches when teams need direct primitive control

## Current Scope and Status

- **Queue SDK**: Alpha and usable now
- **Workflow SDK**: Coming Soon
- **Durable Objects SDK**: Coming Soon

Queue SDK ships first because it solves high-frequency team pain today while establishing architecture patterns reused by future SDKs.

## Design Principles

### Functional API shape first

Prefer composable helpers (`createSDK`, `defineQueue`, `defineWorker`) over broad class surfaces and lifecycle-heavy wiring.

### Typed by default

Contracts should stay close to business logic and remain consistent from producer to consumer to tests.

### Automation over manual glue

Discovery, generation, and Wrangler mapping should be automated where they are deterministic.

### Opinionated, not closed

Use conventions to remove drift, while keeping direct Cloudflare primitives available for advanced needs.

## When To Use Native Cloudflare Directly

Choose native Cloudflare APIs directly when you need:

- runtime behavior outside the currently supported SDK surface
- direct integration with Cloudflare features not yet covered by the suite
- one-off scripts where SDK abstraction is unnecessary

For app teams shipping production workflows, the default tradeoff stays the same: Cloudflare primitives underneath, modern DX on top.
