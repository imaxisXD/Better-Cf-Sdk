---
title: Error Reference
description: Error payload model and common Queue SDK CLI error codes with practical triage flow.
---

Use this page to map error codes to likely causes and fastest next actions.

## What You Will Achieve

- interpret the standard Queue SDK CLI error payload shape
- map common discovery/runtime/admin error codes to fixes
- apply a repeatable triage workflow before rerunning commands

## Before You Start

- capture full CLI error output
- note command context (`dev`, `generate`, `deploy`, or admin command)
- identify recent queue/config changes

## Step 1: Read the Error Payload Shape

A CLI error can include:

- `code`
- `summary`
- optional `file`
- optional `details`
- optional `hint`
- optional `docs` URL

Expected output:

- you can classify failure severity and location quickly from one payload

## Step 2: Map Common Error Codes

### Discovery and generation

- `QUEUE_DISCOVERY_FAILED`
- `SCANNER_FILE_ERROR`
- `NO_QUEUES_FOUND`
- `NON_STATIC_CONFIG`
- `INVALID_HANDLER_MODE`
- `INVALID_PULL_MODE_HANDLER`
- `UNSUPPORTED_PULL_MULTIJOB`
- `QUEUE_NAME_CONFLICT`
- `BINDING_NAME_CONFLICT`

### Wrangler and runtime

- `WRANGLER_TYPES_FAILED`
- `WRANGLER_TYPES_OUTPUT_MISSING`
- `WRANGLER_QUEUE_COMMAND_FAILED`
- `WRANGLER_DEPLOY_FAILED`
- `REMOTE_QUEUE_DEV_UNSUPPORTED`

### Validation and CLI input

- `INVALID_DURATION`
- `INVALID_WRANGLER_ARGUMENT`
- `INVALID_CLI_OPTION`
- `UNEXPECTED_ERROR`

Expected output:

- each error is routed to discovery, runtime, or command-input handling path

## Step 3: Apply Triage Flow

1. read `summary`
2. inspect `details` and `file` when present
3. apply `hint`
4. rerun `better-cf generate` before retrying `dev` or `deploy`

Expected output:

- reduced loop time from error to validated fix

<div class="dx-callout">
  <strong>Good to know:</strong> most queue workflow failures surface during generation, so re-running <code>better-cf generate</code> is the fastest stabilization step.
</div>

## Troubleshooting

### Repeated `NON_STATIC_CONFIG` warnings

Replace deeply computed config values with literals for keys that must be statically extracted.

### Queue conflicts keep reappearing

Audit derived queue and binding names from export names across all queue declaration files.

### Admin command errors lack detail

Re-run with validated arguments and check Wrangler auth/session state separately.

## Next Steps

- Debug command options in [CLI Command Reference](/reference/cli-reference)
- Verify config translation in [Wrangler Mapping Reference](/reference/wrangler-mapping)
- Resolve workflow failures in [Troubleshoot Queue SDK Workflows](/guides/troubleshooting)
