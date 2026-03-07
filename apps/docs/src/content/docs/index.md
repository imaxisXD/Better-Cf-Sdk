---
title: better-cf
template: doc
hero:
  title: better-cf
  tagline: Modern, typed, functional-style SDKs for Cloudflare. 
  actions:
    - text: Start Durable Object SDK
      link: /durable-object/getting-started
      variant: primary
    - text: Queue SDK Quickstart
      link: /getting-started
      variant: secondary
    - text: Compare Approaches
      link: /comparison/cloudflare-vs-better-cf
      variant: minimal
---

## SDK Catalog

<div class="sdk-catalog-grid">
  <article class="sdk-card">
    <div class="sdk-card-header">
      <h3>Durable Object SDK</h3>
      <span class="sl-badge sdk-badge-alpha">Alpha</span>
    </div>
    <p>Schema-first Durable Objects, external queue consumers, generated <code>ctx.api</code>, and thin wrappers over Cloudflare primitives.</p>
    <a class="sdk-card-cta" href="/durable-object/getting-started">Open docs</a>
  </article>
  <article class="sdk-card">
    <div class="sdk-card-header">
      <h3>Queue SDK</h3>
      <span class="sl-badge sdk-badge-alpha">Legacy Surface</span>
    </div>
    <p>The original inline-consumer queue API remains available for existing projects and incremental migrations.</p>
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
</div>

<div class="dx-callout">
  <strong>Design benchmark:</strong> this suite follows the modern DX bar set by tools like Convex, Vercel, Clerk, Upstash, and TanStack Query: typed APIs, obvious defaults, and a workflow that scales with teams.
</div>

## Why This Direction

Cloudflare primitives are powerful, but the day-to-day integration style still feels closer to an older class-era mindset: lots of manual wiring, scattered config, and repeated ceremony.

`better-cf` takes the same shift React went through when functional patterns became the default: less ceremony, clearer composition, and APIs optimized for iteration speed.

## What You Can Do Today with Durable Object SDK (Alpha)

<div class="dx-grid">
  <article class="dx-card">
    <h4>`schema.ts` registry</h4>
    <p>Declare Durable Objects and queues once, then define external behavior in sibling files.</p>
  </article>
  <article class="dx-card">
    <h4>Generated `ctx.api`</h4>
    <p>Call `ctx.api.room.sendMessage(roomId, args)` and `ctx.api.emailQueue.send(args)` without manual stub and binding boilerplate.</p>
  </article>
  <article class="dx-card">
    <h4>Full DO hook coverage</h4>
    <p>Use <code>room.fn</code>, <code>room.fetch</code>, <code>room.alarm</code>, <code>room.init</code>, and <code>room.websocket</code> on top of SQLite Durable Objects.</p>
  </article>
  <article class="dx-card">
    <h4>Queue + DO together</h4>
    <p>External queue consumers integrate cleanly with per-key Durable Object coordination, mirroring how Cloudflare composes these primitives.</p>
  </article>
</div>

<div class="dx-callout">
  <strong>New to the suite?</strong> Start with <a href="/durable-object/getting-started">Durable Object Quickstart</a> for the primary API, then use <a href="/getting-started">Queue SDK Quickstart</a> only if you are staying on the legacy inline-consumer surface.
</div>
