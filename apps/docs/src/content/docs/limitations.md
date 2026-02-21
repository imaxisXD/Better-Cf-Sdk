---
title: Limitations
description: Queue SDK boundaries, known gaps, and when native Cloudflare is the better fit.
---

Use this page to decide where Queue SDK is the right default and where native Cloudflare tooling is currently more appropriate.

## What You Will Achieve

- understand what Queue SDK does not abstract today
- identify known constraints that affect implementation choices
- choose practical fallback paths for unsupported scenarios

## Before You Start

- know your queue workflow requirements (push, pull, admin, observability)
- review queue architecture in [Discovery and Codegen](/architecture/discovery-and-codegen)
- review compatibility surface in [Compatibility Reference](/reference/compatibility)

## Step 1: Check Not-Supported Areas

Queue SDK currently does not provide:

- pull-message runtime abstraction (pull mode is config/admin-focused)
- queue metrics/dashboard abstraction layer
- dynamic runtime queue declaration
- unsupported remote local-dev queue parity modes

Expected output:

- unsupported requirements are identified before implementation starts

## Step 2: Check Known Gaps

Known constraints in current Queue SDK:

- static extraction is strongest with literal config values
- legacy service-worker adapter is compatibility-oriented, not parity-oriented
- non-standard worker export signatures beyond documented variants are out of scope

Expected output:

- implementation plan reflects scanner/runtime constraints and avoids undefined behavior

## Step 3: Choose Workarounds and Fallbacks

Recommended fallback patterns:

- use native Wrangler/Cloudflare APIs directly for advanced unsupported cases
- keep queue declarations literal when possible for mapping fidelity
- use explicit `createSDK<Env>()` when env ownership must be strict
- split mixed concerns across multiple queues instead of overloading one queue mode

Expected output:

- each unsupported requirement has a concrete fallback path

<div class="dx-callout">
  <strong>Good to know:</strong> the recommended default remains Queue SDK for day-to-day app development, with selective native Cloudflare usage where the SDK intentionally does not abstract.
</div>

## Troubleshooting

### Pull workflow expectation mismatch

Treat `consumer.type = "http_pull"` as configuration/admin mode, not a built-in pull client runtime.

### Scanner misses queue behavior flags

Replace dynamic queue config expressions with literals for keys that need static extraction.

### Legacy migration feels blocked

Use legacy compatibility mode temporarily and move toward module-worker exports incrementally.

## Next Steps

- See migration strategy in [Migrate from Legacy Service Worker Mode](/guides/legacy-cloudflare)
- Verify command-level alternatives in [CLI Command Reference](/reference/cli-reference)
- Compare tradeoffs in [Cloudflare vs better-cf](/comparison/cloudflare-vs-better-cf)
