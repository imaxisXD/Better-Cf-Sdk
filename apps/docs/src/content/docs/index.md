---
title: better-cf
template: doc
hero:
  title: better-cf
  tagline: Modern, typed, functional-style SDKs for Cloudflare. 
  actions:
    - text: Start Queue SDK
      link: /getting-started
      variant: primary
    - text: Read the Vision
      link: /why-better-cf
      variant: secondary
    - text: Compare Approaches
      link: /comparison/cloudflare-vs-better-cf
      variant: minimal
---

## SDK Catalog

<div class="sdk-catalog-grid">
  <article class="sdk-card">
    <div class="sdk-card-header">
      <h3>Queue SDK</h3>
      <span class="sl-badge sdk-badge-alpha">Alpha</span>
    </div>
    <p>Typed queue contracts, generated wiring, and a cleaner local workflow for Cloudflare Queues.</p>
    <a class="sdk-card-cta" href="/getting-started">Open docs</a>
  </article>
  <article class="sdk-card sdk-card--coming-soon">
    <div class="sdk-card-header">
      <h3>Workflow SDK</h3>
      <span class="sl-badge sdk-badge-coming-soon">Coming Soon</span>
    </div>
    <p>A structured workflow SDK that applies the same DX-first standards to long-running orchestration on Cloudflare.</p>
    <span class="sdk-card-cta" aria-disabled="true">Not available yet</span>
  </article>
  <article class="sdk-card sdk-card--coming-soon">
    <div class="sdk-card-header">
      <h3>Durable Objects SDK</h3>
      <span class="sl-badge sdk-badge-coming-soon">Coming Soon</span>
    </div>
    <p>Functional, typed patterns for stateful edge coordination without pushing teams back into boilerplate-heavy setup code.</p>
    <span class="sdk-card-cta" aria-disabled="true">Not available yet</span>
  </article>
</div>

<div class="dx-callout">
  <strong>Design benchmark:</strong> this suite follows the modern DX bar set by tools like Convex, Vercel, Clerk, Upstash, and TanStack Query: typed APIs, obvious defaults, and a workflow that scales with teams.
</div>

## Why This Direction

Cloudflare primitives are powerful, but the day-to-day integration style still feels closer to an older class-era mindset: lots of manual wiring, scattered config, and repeated ceremony.

`better-cf` takes the same shift React went through when functional patterns became the default: less ceremony, clearer composition, and APIs optimized for iteration speed.

## What You Can Do Today with Queue SDK (Alpha)

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
    <p>Configure <code>consumer.type = "http_pull"</code> in one place and let mapping to Wrangler stay consistent.</p>
  </article>
  <article class="dx-card">
    <h4>Fast tests</h4>
    <p>Use <code>testQueue</code> to run queue handlers without Cloudflare runtime bootstrap in unit tests.</p>
  </article>
</div>

<div class="dx-callout">
  <strong>New to the suite?</strong> Start with <a href="/why-better-cf">Why better-cf</a>, then follow <a href="/getting-started">Queue SDK Getting Started</a>, and use the <a href="/examples/cookbook">Queue Cookbook</a> as your implementation reference.
</div>
