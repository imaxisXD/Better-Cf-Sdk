---
title: Understand Generated File Structure
description: Know which files are authored vs generated across init, generate, dev, and deploy workflows.
---

Use this guide to understand where Queue SDK writes files and how discovery decides what gets generated.

## What You Will Achieve

- identify files created/updated by `better-cf init` and `better-cf generate`
- separate authored files from managed generated artifacts
- verify queue discovery rules when declarations are not picked up

## Before You Start

- run inside your app project directory
- have Queue SDK installed
- understand basic queue declaration flow

## Step 1: Initialize Project Structure

Run:

```bash
npx better-cf init
```

Expected output:

- `better-cf.config.ts` exists (created if missing)
- `worker.ts` exists when no worker entry is found
- `.better-cf/` directory is ensured
- `.gitignore` includes `.better-cf/`
- `package.json` scripts include `dev`, `generate`, `deploy`
- `wrangler.toml` may be created if no Wrangler config exists

## Step 2: Generate Managed Artifacts

Run:

```bash
npx better-cf generate
```

Expected output:

- `.better-cf/entry.ts` generated
- `.better-cf/types.d.ts` generated
- `.better-cf/wrangler-env.d.ts` generated/fallback written
- `.better-cf/auto-env.d.ts` generated
- Wrangler config patched with managed queue mapping and entry path

## Step 3: Apply Discovery Rules Correctly

Queue discovery picks up declarations when:

- queue declaration is exported
- `defineQueue` is imported from your `better-cf.config` module
- file is valid TypeScript and scannable by the CLI

Expected output:

- discovered queues produce derived queue and binding names
- generation succeeds without discovery blocking errors

<div class="dx-callout">
  <strong>Good to know:</strong> folder name is not part of queue discovery. <code>src/queues/*</code> is convention only, not a requirement.
</div>

## Troubleshooting

### Queue file is ignored

Ensure declaration is exported and imported from `better-cf.config`; then rerun generation.

### Queue/binding name conflicts

Rename queue exports to avoid collisions in derived queue and binding names.

### Generated files appear stale

Run `better-cf generate` and check for scanner diagnostics or invalid static config warnings.

## Next Steps

- Build first end-to-end flow in [Build Your First Queue](/guides/first-queue)
- Understand automation cycles in [Run the Automation CLI Workflow](/guides/automation-cli)
- Inspect architecture internals in [Discovery and Codegen](/architecture/discovery-and-codegen)
