---
title: Configure HTTP Pull Consumers
description: Set up consumer.type="http_pull" queues and operate pull consumers with admin commands.
---

Use pull mode when you need HTTP-driven queue consumption instead of worker push handlers.

## What You Will Achieve

- define a valid pull queue config
- avoid unsupported push-handler combinations in pull mode
- manage pull consumer behavior via admin CLI commands

## Before You Start

- complete [Build Your First Queue](/guides/first-queue)
- understand that pull mode is config/admin-focused in this SDK

## Step 1: Define a Pull Queue

```ts
export const pullQueue = defineQueue({
  message: z.object({ id: z.string() }),
  consumer: { type: 'http_pull', visibilityTimeout: '30s' },
  retry: 5,
  deadLetter: 'pull-dlq'
});
```

Expected output:

- queue discovery accepts config as pull mode
- generated Wrangler config contains pull consumer section fields

## Step 2: Keep Pull Mode Constraints Valid

- do not define `process` or `processBatch` when `consumer.type = 'http_pull'`
- do not use multi-job queue mode with pull consumers

Expected output:

- no `INVALID_PULL_MODE_HANDLER` or `UNSUPPORTED_PULL_MULTIJOB` diagnostics

## Step 3: Manage Pull Consumer Settings

Example commands:

```bash
better-cf queue:consumer:http:add --queue pull-queue --visibility-timeout-secs 30 --message-retries 5
better-cf queue:consumer:http:remove --queue pull-queue
```

Expected output:

- consumer settings are applied through Wrangler-wrapped admin operations

<div class="dx-callout">
  <strong>Good to know:</strong> this SDK currently does not provide a pull-message runtime abstraction. Pull mode is for queue configuration and admin orchestration.
</div>

## Troubleshooting

### `Queue with consumer.type="http_pull" cannot include process/processBatch`

Remove push handlers from pull queue declarations.

### `Multi-job queue mode is not supported when consumer.type="http_pull"`

Split jobs into separate pull queues.

### Pull consumer command fails

Confirm Wrangler auth is valid and queue name arguments are valid Wrangler tokens.

## Next Steps

- Review command details in [CLI Command Reference](/reference/cli-reference)
- Check mapping output in [Wrangler Mapping](/reference/wrangler-mapping)
- Debug validation failures in [Error Reference](/reference/errors)
