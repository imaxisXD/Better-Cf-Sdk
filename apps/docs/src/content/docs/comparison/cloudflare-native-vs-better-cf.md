---
title: Cloudflare Native vs better-cf
description: A factual, opinionated comparison across workflow/DX and API shape.
---

This page compares two ways to build queue-driven Workers:

- **Cloudflare-native path**: raw Wrangler + Cloudflare queue docs workflow
- **better-cf path**: opinionated SDK + automation CLI over those primitives

The goal is not to replace Cloudflare concepts. The goal is to reduce manual wiring and improve team-level DX.

## Table A: Workflow and DX

<div class="dx-table-wrap">
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Concern</th>
        <th>Cloudflare-native flow</th>
        <th>better-cf flow</th>
        <th>Why it matters</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Concern"><strong>Queue contract definition</strong></td>
        <td data-label="Cloudflare-native flow">You define payload shape by convention or custom runtime validation in handler code.</td>
        <td data-label="better-cf flow">`defineQueue({ message: z.object(...) })` establishes contract and typed send/process usage.</td>
        <td data-label="Why it matters">Teams get one obvious source of truth for payload structure.</td>
      </tr>
      <tr>
        <td data-label="Concern"><strong>Entry and binding wiring</strong></td>
        <td data-label="Cloudflare-native flow">Manual entry exports + wrangler consumer sections maintained by hand.</td>
        <td data-label="better-cf flow">`better-cf dev/generate` scans queue exports, generates entry, and patches supported Wrangler configs.</td>
        <td data-label="Why it matters">Reduces config drift and repetitive maintenance.</td>
      </tr>
      <tr>
        <td data-label="Concern"><strong>Local dev loop</strong></td>
        <td data-label="Cloudflare-native flow">You orchestrate your own watch/rebuild/update cycle.</td>
        <td data-label="better-cf flow">Single automation loop for scan → validate → generate → patch → run/restart.</td>
        <td data-label="Why it matters">One command for the common daily workflow.</td>
      </tr>
      <tr>
        <td data-label="Concern"><strong>Error messaging shape</strong></td>
        <td data-label="Cloudflare-native flow">Errors vary by command/tooling context.</td>
        <td data-label="better-cf flow">CLI errors are normalized (`code`, `summary`, `details`, `hint`, optional docs URL).</td>
        <td data-label="Why it matters">Faster triage and easier onboarding.</td>
      </tr>
      <tr>
        <td data-label="Concern"><strong>Testing queue handlers</strong></td>
        <td data-label="Cloudflare-native flow">You build custom harnesses or rely on broader integration setup.</td>
        <td data-label="better-cf flow">`testQueue` runs queue consumption logic directly in unit tests.</td>
        <td data-label="Why it matters">Shorter feedback loops for queue logic.</td>
      </tr>
    </tbody>
  </table>
</div>

## Table B: API Surface Comparison

<div class="dx-table-wrap">
  <table class="comparison-table">
    <thead>
      <tr>
        <th>Capability</th>
        <th>Cloudflare primitive</th>
        <th>better-cf API</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td data-label="Capability"><strong>SDK bootstrap</strong></td>
        <td data-label="Cloudflare primitive">Direct Worker runtime + queue bindings</td>
        <td data-label="better-cf API"><code>createSDK&lt;Env&gt;()</code></td>
        <td data-label="Notes">Returns typed `defineQueue` and `defineWorker` helpers.</td>
      </tr>
      <tr>
        <td data-label="Capability"><strong>Queue definition</strong></td>
        <td data-label="Cloudflare primitive">Queue handler + custom schema and branching</td>
        <td data-label="better-cf API"><code>defineQueue({ message, process | processBatch, ... })</code></td>
        <td data-label="Notes">Supports push mode, pull config mode, and multi-job mode.</td>
      </tr>
      <tr>
        <td data-label="Capability"><strong>Producer send</strong></td>
        <td data-label="Cloudflare primitive"><code>env.MY_QUEUE.send/sendBatch</code></td>
        <td data-label="better-cf API"><code>queue.send</code> / <code>queue.sendBatch</code></td>
        <td data-label="Notes">Supports typed payload plus delay/content-type options.</td>
      </tr>
      <tr>
        <td data-label="Capability"><strong>Worker wrapper</strong></td>
        <td data-label="Cloudflare primitive">Manual fetch/scheduled export wiring</td>
        <td data-label="better-cf API"><code>defineWorker({ fetch, scheduled? })</code></td>
        <td data-label="Notes">Typed `ctx.env` with generated bindings included.</td>
      </tr>
      <tr>
        <td data-label="Capability"><strong>Queue testing</strong></td>
        <td data-label="Cloudflare primitive">Custom mocks/harnesses</td>
        <td data-label="better-cf API"><code>testQueue(handle, options)</code></td>
        <td data-label="Notes">Returns acked/retried payloads for assertions.</td>
      </tr>
      <tr>
        <td data-label="Capability"><strong>Queue admin ops</strong></td>
        <td data-label="Cloudflare primitive">Wrangler queue/subscription commands</td>
        <td data-label="better-cf API"><code>better-cf queue:* / subscription:*</code></td>
        <td data-label="Notes">Structured wrapper commands over Wrangler operations.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="dx-callout">
  <strong>Practical default:</strong> Use `better-cf` for app-level queue development and keep native Cloudflare commands available for edge cases.
</div>
