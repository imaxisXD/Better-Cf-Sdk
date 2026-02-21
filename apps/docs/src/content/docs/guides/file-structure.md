---
title: File Structure
description: What files better-cf creates in your project after install and CLI commands, and how to use them.
---

This page is about **your app project structure** after using the CLI.

Source of truth for everything below:

- `packages/better-cf/src/cli/commands/init.ts`
- `packages/better-cf/src/cli/commands/generate.ts`
- `packages/better-cf/src/cli/codegen.ts`
- `packages/better-cf/src/cli/env-types.ts`
- `packages/better-cf/src/cli/wrangler/*.ts`

## After Install + `better-cf init`

Run:

```bash
npx better-cf init
```

`init` creates/updates these files in your project:

| File | Created or Updated | Why |
|---|---|---|
| `better-cf.config.ts` | Created if missing | Exports `defineQueue`/`defineWorker` and `betterCfConfig`. |
| `worker.ts` | Created if both `worker.ts` and `src/worker.ts` are missing | Default worker entry scaffold. |
| `.better-cf/` | Ensured directory exists | Output folder for generated files. |
| `.gitignore` | Created if missing, or appended | Ensures `.better-cf/` is ignored. |
| `package.json` | Updated if present | Adds/sets scripts: `dev`, `deploy`, `generate`. |
| `wrangler.toml` | Created only if no `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` exists | Initial Wrangler config with `main = ".better-cf/entry.ts"` and managed markers. |

## After `better-cf generate`

Run:

```bash
npx better-cf generate
```

`generate` creates these files:

| File | Why it exists | Do you edit it? |
|---|---|---|
| `.better-cf/entry.ts` | Generated worker entry that wires discovered queues + your worker handlers. | No (generated). |
| `.better-cf/types.d.ts` | Generated queue binding type augmentation (`BetterCfGeneratedBindings`). | No (generated). |
| `.better-cf/wrangler-env.d.ts` | Output of `wrangler types` (or fallback when skipped). | No (generated). |
| `.better-cf/auto-env.d.ts` | Merges Wrangler env type into `BetterCfAutoEnv`. | No (generated). |

`generate` also patches Wrangler config:

- Updates `main` to `.better-cf/entry.ts`.
- Syncs queue producer/consumer sections from discovered queue definitions.
- Supports `wrangler.toml`, `wrangler.jsonc`, and `wrangler.json`.

## `better-cf dev` and `better-cf deploy`

| Command | What it does with files |
|---|---|
| `better-cf dev` | Runs the same generate pipeline, then starts `wrangler dev`; re-runs generation on file changes. |
| `better-cf deploy` | Runs the same generate pipeline, then runs `wrangler deploy`. |

## Minimal App Structure for Queue Work

After `init` and creating one queue, a typical project looks like:

```text
your-project/
  better-cf.config.ts          # authored by you (created by init)
  worker.ts                    # authored by you (created by init if missing)
  src/
    queues/
      signup.ts                # authored by you (defineQueue export)
  wrangler.toml                # created or patched by CLI
  .better-cf/
    entry.ts                   # generated
    types.d.ts                 # generated
    wrangler-env.d.ts          # generated
    auto-env.d.ts              # generated
```

`src/queues/*` is a common convention shown in examples, not a required folder.

## How to Do Queue End-to-End

1. Run `npx better-cf init`.
2. Define queue exports in your app (for example `src/queues/signup.ts`) using `defineQueue(...)`.
3. Keep worker HTTP/scheduled handlers in `worker.ts` using `defineWorker(...)`.
4. Run `npx better-cf dev` for local development.
5. Run `npx better-cf deploy` to deploy.

## Queue Discovery Rules (Why a Queue Is or Isn’t Picked Up)

Queue discovery scans your project for exported `defineQueue(...)` usage and then generates wiring.

Practical implications:

- Queue declarations must be exported.
- The file must import `defineQueue` from your `better-cf.config` module.
- Folder name and location are not part of discovery (`src/q/*`, `src/queues/*`, or any other path all work).
- Queue/binding names are derived automatically from export names.
  - Example: `signupQueue` -> queue name `signup` -> binding `QUEUE_SIGNUP`.

## Queue/Subscription Admin Commands (No Local File Creation)

These commands call Wrangler APIs and typically do not create local files:

- `queue:list`, `queue:create`, `queue:update`, `queue:delete`, `queue:info`, `queue:pause`, `queue:resume`, `queue:purge`
- `queue:consumer:http:add`, `queue:consumer:http:remove`
- `queue:consumer:worker:add`, `queue:consumer:worker:remove`
- `subscription:list`, `subscription:create`, `subscription:get`, `subscription:update`, `subscription:delete`
