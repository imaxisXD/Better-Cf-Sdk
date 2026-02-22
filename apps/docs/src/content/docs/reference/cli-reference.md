---
title: CLI Command Reference
description: Command-by-command reference for better-cf queue workflow and admin operations.
---

Use this reference to look up exact `better-cf` command names, required flags, and common usage patterns.

## What You Will Achieve

- find the right command for local development, deploy, or queue admin operations
- use required flags correctly on first run
- map command groups to queue lifecycle stages

## Before You Start

- `better-cf` installed in the current workspace (`npx better-cf ...` also works)
- Wrangler installed and authenticated for admin operations
- queue names and resource identifiers available

## Step 1: Use Core Workflow Commands

### `better-cf create [project-directory]`

Create a new `better-cf` project scaffold in a new or empty target folder.

Options:

- `-y, --yes`: accept defaults and skip interactive prompts
- `--no-install`: scaffold project files without installing dependencies
- `--force`: allow scaffolding in a non-empty target folder
- `--use-npm`: install with npm
- `--use-pnpm`: install with pnpm
- `--use-yarn`: install with yarn
- `--use-bun`: install with bun

Examples:

```bash
better-cf create my-worker
better-cf create my-worker --no-install
better-cf create my-worker --use-pnpm
better-cf create my-worker --use-bun
better-cf create . --force
```

### `better-cf init`

Initialize `better-cf` in the current project directory (in place).

`init` does not create a new project folder. Use `create` for blank-project bootstrap.

### `better-cf generate`

Scan queue exports and regenerate `.better-cf` output files.

### `better-cf dev`

Run generation + `wrangler dev` loop.

Options:

- `-p, --port <port>`: port passed to `wrangler dev` (default `8787`)
- `--no-watch`: disable file watching
- `--remote`: accepted by CLI but intentionally blocked for queue workflow

### `better-cf deploy`

Run generation and deploy through Wrangler.

## Step 2: Use Queue Lifecycle Commands

| Command | Required flags | Optional flags |
|---|---|---|
| `queue:list` | none | none |
| `queue:create` | `--name <name>` | `--delivery-delay-secs <seconds>`, `--message-retention-period-secs <seconds>` |
| `queue:update` | `--name <name>` | `--delivery-delay-secs <seconds>`, `--message-retention-period-secs <seconds>` |
| `queue:delete` | `--name <name>` | none |
| `queue:info` | `--name <name>` | none |
| `queue:pause` | `--name <name>` | none |
| `queue:resume` | `--name <name>` | none |
| `queue:purge` | `--name <name>` | none |

Example:

```bash
better-cf queue:create --name email --delivery-delay-secs 10
better-cf queue:update --name email --message-retention-period-secs 86400
```

## Step 3: Use Consumer Management Commands

| Command | Required flags | Optional flags |
|---|---|---|
| `queue:consumer:http:add` | `--queue <queue>` | `--batch-size <size>`, `--message-retries <retries>`, `--dead-letter-queue <queue>`, `--visibility-timeout-secs <seconds>`, `--retry-delay-secs <seconds>` |
| `queue:consumer:http:remove` | `--queue <queue>` | none |
| `queue:consumer:worker:add` | `--queue <queue>`, `--script <script>` | `--batch-size <size>`, `--batch-timeout <seconds>`, `--message-retries <retries>`, `--dead-letter-queue <queue>`, `--max-concurrency <count>`, `--retry-delay-secs <seconds>` |
| `queue:consumer:worker:remove` | `--queue <queue>`, `--script <script>` | none |

Example:

```bash
better-cf queue:consumer:http:add --queue email --visibility-timeout-secs 30 --message-retries 5
better-cf queue:consumer:worker:add --queue email --script api-worker --batch-size 20 --max-concurrency 4
```

## Step 4: Use Subscription Commands

| Command | Required flags | Optional flags |
|---|---|---|
| `subscription:list` | `--queue <queue>` | `--page <page>`, `--per-page <count>`, `--json` |
| `subscription:create` | `--queue <queue>`, `--source <source>`, `--events <events>` | `--name <name>`, `--enabled <true|false>`, `--model-name <modelName>`, `--worker-name <workerName>`, `--workflow-name <workflowName>` |
| `subscription:get` | `--queue <queue>`, `--id <id>` | `--json` |
| `subscription:update` | `--queue <queue>`, `--id <id>` | `--name <name>`, `--events <events>`, `--enabled <true|false>`, `--json` |
| `subscription:delete` | `--queue <queue>`, `--id <id>` | `--force` |

Example:

```bash
better-cf subscription:list --queue email --json
better-cf subscription:create --queue email --source email --events message.acked --name email-sub
better-cf subscription:delete --queue email --id sub_123 --force
```

<div class="dx-callout">
  <strong>Good to know:</strong> numeric options are validated as non-negative integers. Invalid values fail fast with <code>INVALID_CLI_OPTION</code>.
</div>

## Troubleshooting

### Invalid option value errors

Use integer values for numeric flags and explicit `true|false` values for boolean flags.

### Wrangler command wrapper failures

Check Wrangler auth/session and ensure queue/subscription identifiers are valid.

### Remote dev confusion

`better-cf dev --remote` is intentionally blocked for queue local workflow.

## Next Steps

- Understand automation behavior in [Automation CLI](/guides/automation-cli)
- Manage resources safely with [Queue Admin CLI](/guides/queue-admin-cli)
- Debug command failures via [Error Reference](/reference/errors)
