---
title: Limitations
description: Current boundaries, known gaps, and when native Cloudflare is a better fit.
---

## Not Supported

- Pull-message runtime abstraction (the SDK supports pull queue config/admin surfaces, not pull message client execution)
- Queue metrics/dashboard abstraction layer
- Dynamic runtime queue declaration
- Unsupported remote local-dev queue parity modes

## Known Gaps

- Static queue extraction is strongest with literal config values; non-literals reduce mapping fidelity
- Legacy service-worker adapter mode is compatibility-focused, not feature parity focused
- Non-standard worker export signatures beyond documented variants are out of scope

## Workarounds and Alternatives

- Use native Wrangler/Cloudflare APIs directly for advanced or unsupported cases
- Keep queue definitions literal where possible to improve scanner accuracy
- Use explicit `createSDK<Env>()` when your app needs strict typing boundaries over inferred env mode
- Split mixed concerns into multiple queues rather than forcing one queue into unsupported patterns

## Choose Native Cloudflare If...

- You need direct runtime behavior not modeled by this SDK
- You are building a very small one-off script and abstraction overhead is not useful
- You rely on Cloudflare features currently outside `better-cf`’s supported API surface

<div class="dx-callout">
  <strong>Recommended default:</strong> use `better-cf` for day-to-day app workflows and drop to native Cloudflare tooling only where the SDK intentionally does not abstract.
</div>
