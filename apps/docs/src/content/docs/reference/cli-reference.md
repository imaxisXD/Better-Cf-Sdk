---
title: CLI Command Reference
description: Command-by-command reference for better-cf SDK workflow utilities.
---

Use this reference to look up exact `better-cf` command names, required flags, and common usage patterns.

## What You Will Achieve

- scaffold a new project quickly
- run queue plus Durable Object discovery and codegen reliably
- iterate locally and deploy safely
- manage template installs with the registry utility
- inspect project structure with the tree utility

## Before You Start

- `better-cf` installed in the current workspace (`npx better-cf ...` also works)
- Wrangler installed and authenticated (for deploy and infra admin commands)

## Core Workflow Commands

### `better-cf create [project-directory]`

Create a new `better-cf` project scaffold in a new or empty target folder.

Options:

- `-y, --yes`: accept defaults and skip interactive prompts
- `--no-install`: scaffold project files without installing dependencies
- `--force`: allow scaffolding in a non-empty target folder
- `--package-manager <npm|pnpm|yarn|bun>`: select install tool

Examples:

```bash
better-cf create my-worker
better-cf create my-worker --no-install
better-cf create my-worker --package-manager pnpm
better-cf create . --force
```

### `better-cf init`

Initialize `better-cf` in the current project directory (in place).

`init` does not create a new project folder. Use `create` for blank-project bootstrap.

### `better-cf generate`

Scan declarations, builders, and worker entrypoints, then regenerate `.better-cf` output files.

### `better-cf dev`

Run generation + `wrangler dev` loop.

Options:

- `-p, --port <port>`: port passed to `wrangler dev` (default `8787`)
- `--no-watch`: disable file watching
- `--remote`: accepted by CLI but intentionally blocked for queue workflow

### `better-cf deploy`

Run generation and deploy through Wrangler.

## Registry Commands

### `better-cf registry list`

List local/remote registry entries available for install.

### `better-cf registry info <id>`

Show entry details, generated files, and dependency hints.

### `better-cf registry add <id> [target]`

Install registry entry files into the target directory.

### `better-cf registry cache clear`

Clear cached remote registry metadata (`.better-cf/cache/registry.json` by default).

## Tree Command

### `better-cf tree [path]`

Print a project tree (uses system `tree` utility when available, with internal fallback).

Options:

- `-d, --depth <depth>`: maximum recursion depth
- `-i, --ignore <patterns>`: comma-separated names to skip
- `--json`: JSON output mode

## Infra Admin Commands

`better-cf` no longer wraps queue/subscription infra admin commands.
Use Wrangler directly for these operations:

```bash
wrangler queues list
wrangler queues create email
wrangler queues subscription list email --json
```

## Troubleshooting

### Invalid option value errors

Use integer values for numeric flags and valid package manager values for `--package-manager`.

### Remote dev confusion

`better-cf dev --remote` is intentionally blocked for the managed local workflow.

## Next Steps

- Understand automation behavior in [Automation CLI](/guides/automation-cli)
- Manage queue resources with [Queue Admin CLI](/guides/queue-admin-cli)
- Debug command failures via [Error Reference](/reference/errors)
