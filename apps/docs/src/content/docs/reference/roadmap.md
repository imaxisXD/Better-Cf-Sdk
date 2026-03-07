---
title: Roadmap
description: Directional roadmap for the better-cf SDK suite and current maturity status.
---

This roadmap describes direction and prioritization, not release-date guarantees.

## What You Will Achieve

- understand current package maturity across the suite
- see what Durable Object SDK Alpha is optimizing now
- understand how future namespaces are planned and constrained

## Before You Start

- identify your current adoption stage (new build vs migration)
- review current Queue SDK legacy limits in [Limitations](/limitations)
- align expectations with directional roadmap semantics

## Step 1: Read Current SDK Status

- `better-cf/durable-object`: **Alpha**
- `better-cf/queue`: **Alpha (Legacy Surface)**
- `better-cf/workflow`: **Coming Soon**

Expected output:

- current production adoption decisions are aligned to maturity stage

## Step 2: Understand Current Focus

Current focus areas:

- stabilize durable-object DX and scanner reliability
- expand docs around `schema.ts`, `ctx.api`, and queue + DO composition
- keep generated wiring predictable across supported Wrangler configs
- preserve legacy queue projects while moving new work to the durable-object surface

Expected output:

- roadmap interpretation is tied to active engineering priorities

## Step 3: Understand Planned Progression

- Durable Object SDK remains Alpha while core ergonomics and edge cases are hardened
- Queue SDK remains supported, but the legacy inline-consumer model is no longer the primary API direction
- progression target is Beta, then stable criteria
- reserved namespaces still indicate intended product direction, not near-term release timing

Reserved namespaces:

- `better-cf/workflow`

Expected output:

- roadmap expectations are realistic and non-speculative

<div class="dx-callout">
  <strong>Good to know:</strong> the durable-object namespace is now shipped. Workflow remains directional only.
</div>

## Troubleshooting

### Team treats roadmap as release contract

Use roadmap for directional planning and gate release dependencies on shipped milestones only.

### Alpha concerns block adoption entirely

Adopt the Durable Object SDK for bounded stateful workflows first and keep native Cloudflare fallbacks for unsupported edges.

### Future namespace confusion

Treat unshipped namespaces as non-actionable until package docs and compatibility surfaces are published.

## Next Steps

- Validate current support boundaries in [Compatibility Reference](/reference/compatibility)
- Evaluate tradeoffs in [Cloudflare vs better-cf](/comparison/cloudflare-vs-better-cf)
- Track architecture assumptions in [IA Benchmark (Next.js App Router)](/reference/ia-benchmark-next-app-router)
