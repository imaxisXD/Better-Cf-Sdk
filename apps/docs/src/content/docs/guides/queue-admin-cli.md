---
title: Queue Admin CLI
description: Use Wrangler for queue and subscription infrastructure administration with either the primary durable-object surface or the legacy queue surface.
---

This guide explains how to manage Cloudflare Queues infrastructure now that `better-cf` focuses on SDK DX workflow commands instead of wrapping queue admin commands directly.

## What Changed

`better-cf` no longer exposes queue/subscription admin wrappers.
For queue infra operations, use Wrangler directly.

## Queue Lifecycle (Wrangler)

```bash
wrangler queues list
wrangler queues create email --delivery-delay-secs 10
wrangler queues update email --message-retention-period-secs 86400
wrangler queues info email
wrangler queues pause-delivery email
wrangler queues resume-delivery email
wrangler queues purge email
```

## Consumer Management (Wrangler)

```bash
wrangler queues consumer http add email --visibility-timeout-secs 30 --message-retries 5
wrangler queues consumer worker add email api-worker --batch-size 20 --max-concurrency 4
wrangler queues consumer http remove email
wrangler queues consumer worker remove email api-worker
```

## Subscription Management (Wrangler)

```bash
wrangler queues subscription list email --json
wrangler queues subscription create email --source email --events message.acked --name email-sub
wrangler queues subscription get email --id sub_123 --json
wrangler queues subscription update email --id sub_123 --enabled false
wrangler queues subscription delete email --id sub_123 --force
```

## When to Use better-cf vs Wrangler

- Use `better-cf` for: `create`, `init`, `generate`, `dev`, `deploy`, registry/tree utilities, generated queue and Durable Object wiring.
- Use Wrangler for: queue/subscription resource administration.

## Next Steps

- Review command matrix in [CLI Command Reference](/reference/cli-reference)
- Understand generation loop internals in [Automation CLI](/guides/automation-cli)
