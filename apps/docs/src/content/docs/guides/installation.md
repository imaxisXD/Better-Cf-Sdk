---
title: Install Queue SDK and Tooling
description: Install better-cf, Wrangler, and TypeScript prerequisites for Queue SDK development.
---

Set up the minimum tooling needed to run Queue SDK locally and generate queue wiring.

## What You Will Achieve

- install runtime and dev dependencies required by Queue SDK
- choose the right onboarding flow for an existing project or a new blank project
- verify your local environment can run the local generation + dev workflow

## Before You Start

- Node.js `>=18.18`
- `npm` available in your shell

## Choose Your Path

- [Path A: Existing Worker Project](#path-a-existing-worker-project)
- [Path B: New Blank Project](#path-b-new-blank-project)

## Path A: Existing Worker Project

### Step 1: Install Runtime and Dev Dependencies

Run in your existing Worker project folder:

```bash
npm i better-cf zod
npm i -D wrangler @cloudflare/workers-types typescript
```

Expected output:

- packages install successfully with no unresolved peer dependency errors
- your `package.json` contains `better-cf` and `zod`

### Step 2: Initialize better-cf Project Files In Place

Run:

```bash
npx better-cf init
```

Expected output:

- `better-cf.config.ts` exists
- `worker.ts` exists (if missing before)
- `.better-cf/` exists
- `wrangler.toml` exists or is updated for managed queue mapping

### Step 3: Verify Local Dev Loop

Run:

```bash
npm run dev
```

Expected output:

- queue scanning and generation runs
- `wrangler dev` starts after generation

## Path B: New Blank Project

Run:

```bash
npx better-cf create my-worker
cd my-worker
npm run dev
```

Expected output:

- a new project folder is scaffolded
- dependencies are installed (unless skipped)
- local generation + `wrangler dev` starts from `npm run dev`

Optional package manager flags:

```bash
npx better-cf create my-worker --use-pnpm
npx better-cf create my-worker --use-bun
```

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
