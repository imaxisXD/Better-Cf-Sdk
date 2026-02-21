---
title: Operate Queues with Admin CLI
description: Use queue and subscription admin commands safely with better-cf Wrangler wrappers.
---

Use admin commands to manage queue resources and consumers without manually composing Wrangler subcommands.

## What You Will Achieve

- run queue lifecycle operations from one CLI surface
- manage worker/http consumers and subscriptions with validated options
- understand required flags and common failure modes

## Before You Start

- Wrangler installed and authenticated
- queue names and script names prepared
- read command surface in [CLI Command Reference](/reference/cli-reference)

## Step 1: Run Queue Lifecycle Commands

```bash
better-cf queue:list
better-cf queue:create --name email --delivery-delay-secs 10
better-cf queue:update --name email --message-retention-period-secs 86400
better-cf queue:info --name email
better-cf queue:pause --name email
better-cf queue:resume --name email
better-cf queue:purge --name email
```

Expected output:

- queue resources are listed/updated through Wrangler wrappers

## Step 2: Manage Queue Consumers

```bash
better-cf queue:consumer:http:add --queue email --visibility-timeout-secs 30 --message-retries 5
better-cf queue:consumer:worker:add --queue email --script api-worker --batch-size 20 --max-concurrency 4
```

Expected output:

- consumer settings are applied to the target queue

## Step 3: Manage Queue Subscriptions

```bash
better-cf subscription:list --queue email --json
better-cf subscription:create --queue email --source email --events message.acked --name email-sub
better-cf subscription:get --queue email --id sub_123 --json
better-cf subscription:update --queue email --id sub_123 --enabled false
better-cf subscription:delete --queue email --id sub_123 --force
```

Expected output:

- subscription lifecycle operations complete with structured output/errors

<div class="dx-callout">
  <strong>Good to know:</strong> command wrappers normalize errors into consistent fields such as <code>code</code>, <code>summary</code>, and optional <code>hint</code>.
</div>

## Troubleshooting

### `WRANGLER_QUEUE_COMMAND_FAILED`

Validate Wrangler auth/session and re-run the exact command with verified queue/script identifiers.

### Invalid queue/subscription argument errors

Check option values against Wrangler token constraints and required flag combinations.

### Admin command changed wrong resource

Confirm queue names and subscription IDs in command history before retrying updates/deletes.

## Next Steps

- Review full option matrix in [CLI Command Reference](/reference/cli-reference)
- Tune queue behavior in [Retry + DLQ + Batch Tuning](/guides/retry-batch-tuning)
- Resolve failures with [Error Reference](/reference/errors)
