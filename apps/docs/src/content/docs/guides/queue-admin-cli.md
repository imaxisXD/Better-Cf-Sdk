---
title: Queue Admin CLI
description: Structured queue and subscription admin wrappers over Wrangler commands.
---

`better-cf` provides queue/subscription admin commands that wrap Wrangler operations with consistent validation and error shape.

## Command Groups

### Queue lifecycle

- `queue:list`
- `queue:create`
- `queue:update`
- `queue:delete`
- `queue:info`
- `queue:pause`
- `queue:resume`
- `queue:purge`

### Consumer management

- `queue:consumer:http:add`
- `queue:consumer:http:remove`
- `queue:consumer:worker:add`
- `queue:consumer:worker:remove`

### Subscription management

- `subscription:list`
- `subscription:create`
- `subscription:get`
- `subscription:update`
- `subscription:delete`

## Examples

```bash
better-cf queue:list
better-cf queue:create --name email --delivery-delay-secs 10
better-cf queue:update --name email --message-retention-period-secs 86400
better-cf queue:info --name email
better-cf queue:pause --name email
better-cf queue:resume --name email
```

```bash
better-cf queue:consumer:http:add --queue email --visibility-timeout-secs 30 --message-retries 5
better-cf queue:consumer:worker:add --queue email --script api-worker --batch-size 20 --max-concurrency 4
```

```bash
better-cf subscription:list --queue email --json
better-cf subscription:create --queue email --source email --events message.acked --name email-sub
better-cf subscription:get --queue email --id sub_123 --json
better-cf subscription:update --queue email --id sub_123 --enabled false
better-cf subscription:delete --queue email --id sub_123 --force
```

## Error Model

When wrappers fail, errors are normalized with:

- `code`
- `summary`
- optional `details`
- optional `hint`
- optional `docs` URL

Common admin wrapper codes include `WRANGLER_QUEUE_COMMAND_FAILED` and `INVALID_WRANGLER_ARGUMENT`.

## Requirements

- Wrangler must be installed and authenticated
- Queue/resource names must be valid Wrangler tokens
- These commands execute Wrangler operations; they are not dry-run by default
