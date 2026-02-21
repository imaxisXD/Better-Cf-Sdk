---
title: better-cf
template: splash
hero:
  title: Opinionated Cloudflare Queue SDK for teams that care about DX
  tagline: Typed queue contracts, generated wiring, and cleaner runtime ergonomics over raw Cloudflare queue setup.
  actions:
    - text: Start in 5 Minutes
      link: /getting-started
      variant: primary
    - text: Browse Cookbook
      link: /examples/cookbook
      variant: secondary
    - text: Compare Approaches
      link: /comparison/cloudflare-vs-better-cf
      variant: minimal
---

<div class="dx-grid">
  <article class="dx-card">
    <span class="dx-pill">Typed by default</span>
    <h3>Queue payloads are schemas, not conventions</h3>
    <p>Define queues with Zod and get typed producer + consumer flows without hand-written runtime glue.</p>
  </article>
  <article class="dx-card">
    <span class="dx-pill">Automation loop</span>
    <h3>Queue wiring is generated</h3>
    <p>`better-cf dev` scans queue definitions, generates entry files, patches Wrangler config, and keeps local dev in sync.</p>
  </article>
  <article class="dx-card">
    <span class="dx-pill">Pragmatic control</span>
    <h3>Opinionated, not limiting</h3>
    <p>You still keep direct Cloudflare primitives available while using a higher-level SDK shape that is easier to maintain.</p>
  </article>
</div>

## What You Can Do Quickly

<div class="dx-grid">
  <article class="dx-card">
    <h4>Push consumers</h4>
    <p>Single-message or batch queue processing with retry/dead-letter configuration and explicit failure hooks.</p>
  </article>
  <article class="dx-card">
    <h4>Multi-job queues</h4>
    <p>Model one queue with multiple typed job contracts while sharing retry and delivery defaults.</p>
  </article>
  <article class="dx-card">
    <h4>HTTP pull consumers</h4>
    <p>Configure `consumer.type = "http_pull"` in one place and let mapping to Wrangler stay consistent.</p>
  </article>
  <article class="dx-card">
    <h4>Fast tests</h4>
    <p>Use `testQueue` to run queue handlers without Cloudflare runtime bootstrap in unit tests.</p>
  </article>
</div>

<div class="dx-callout">
  <strong>New to the project?</strong> Start with <a href="/why-better-cf">Why better-cf</a>, then follow <a href="/getting-started">Getting Started</a>, and use the <a href="/examples/cookbook">Cookbook</a> as your implementation reference.
</div>
