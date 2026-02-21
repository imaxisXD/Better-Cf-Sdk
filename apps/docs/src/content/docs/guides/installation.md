---
title: Install Queue SDK and Tooling
description: Install better-cf, Wrangler, and TypeScript prerequisites for Queue SDK development.
---

Set up the minimum tooling needed to run Queue SDK locally and generate queue wiring.

## What You Will Achieve

- install runtime and dev dependencies required by Queue SDK
- initialize baseline project files with `better-cf init`
- verify your local environment can run the docs workflow

## Before You Start

- Node.js `>=18.18`
- an existing Worker project folder (or a new empty project)
- `npm` available in your shell

## Step 1: Install Runtime and Dev Dependencies

Run:

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
```

Expected output:

- packages install successfully with no unresolved peer dependency errors
- your `package.json` contains `better-cf` and `zod`

## Step 2: Initialize better-cf Project Files

Run:

```bash
npx better-cf init
```

Expected output:

- `better-cf.config.ts` exists
- `worker.ts` exists (if missing before)
- `.better-cf/` exists
- `wrangler.toml` exists or is updated for managed queue mapping

## Step 3: Verify Local Dev Loop

Run:

```bash
npm run dev
```

Expected output:

- queue scanning and generation runs
- `wrangler dev` starts after generation

<div class="dx-callout">
  <strong>Good to know:</strong> queue definition files can live in any folder. Discovery is based on exported <code>defineQueue(...)</code> usage imported from <code>better-cf.config</code>, not folder name.
</div>

## Troubleshooting

### `better-cf` command not found

Use `npx better-cf ...` to run the local package binary.

### `wrangler` not found

Install dev dependencies in the same workspace where you run `npm run dev`.

### `NO_QUEUES_FOUND` warning during dev

This is expected before creating your first exported `defineQueue(...)`.

## Next Steps

- Build your first queue end-to-end in [First Queue Walkthrough](/guides/first-queue)
- Run the fast path in [Quickstart](/getting-started)
- Choose typing strategy in [Env Typing Modes](/guides/env-typing-modes)
