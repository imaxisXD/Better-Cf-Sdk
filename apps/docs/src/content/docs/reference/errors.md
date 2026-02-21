---
title: Error Reference
description: CLI error payload shape and common error codes.
---

`better-cf` CLI errors use a structured model to make failures actionable.

## Error Payload Shape

A CLI error can include:

- `code`
- `summary`
- optional `file`
- optional `details`
- optional `hint`
- optional `docs` URL

## Common Codes

### Discovery and generation

- `QUEUE_DISCOVERY_FAILED`: queue scanning found blocking diagnostics
- `SCANNER_FILE_ERROR`: scanner could not read or parse a source file
- `NO_QUEUES_FOUND`: no `defineQueue` exports discovered
- `NON_STATIC_CONFIG`: queue config was not statically extractable
- `INVALID_PROCESS_MODE`: invalid `process`/`processBatch` combination
- `INVALID_PULL_MODE_HANDLER`: `http_pull` queue contains push handlers
- `UNSUPPORTED_PULL_MULTIJOB`: multi-job queue used with `http_pull`
- `QUEUE_NAME_CONFLICT`: duplicate queue names detected
- `BINDING_NAME_CONFLICT`: duplicate binding names detected

### Wrangler and runtime

- `WRANGLER_TYPES_FAILED`: `wrangler types` command failed
- `WRANGLER_TYPES_OUTPUT_MISSING`: expected generated type output not found
- `WRANGLER_QUEUE_COMMAND_FAILED`: wrapped Wrangler admin command failed
- `WRANGLER_DEPLOY_FAILED`: Wrangler deploy command failed
- `REMOTE_QUEUE_DEV_UNSUPPORTED`: `better-cf dev --remote` is blocked for queue workflow

### Validation and CLI input

- `INVALID_DURATION`: unsupported duration value or format
- `INVALID_WRANGLER_ARGUMENT`: invalid queue/subscription argument value
- `INVALID_CLI_OPTION`: invalid command-line option value
- `UNEXPECTED_ERROR`: uncaught fallback error wrapper

## Triage Workflow

1. read `summary`
2. inspect `details` and `file` (if present)
3. apply `hint`
4. re-run `better-cf generate` to verify scanner/config state before `dev` or `deploy`
