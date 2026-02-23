import { parseDurationSeconds } from './utils.js';
import type {
  AnyJobConfig,
  AnyPushQueueConfig,
  BatchContext,
  ConsumerBatchEntry,
  Duration,
  QueueContext,
  QueueDefinition,
  QueueEnv
} from './types.js';

export async function consumeQueueDefinition<E>(
  definition: QueueDefinition<E>,
  batch: MessageBatch<unknown>,
  env: E,
  executionCtx: ExecutionContext
): Promise<void> {
  if (definition.kind === 'single') {
    if (definition.mode === 'pull') {
      console.warn(
        `[better-cf] Queue "${batch.queue}" configured as http_pull. Worker queue handler is disabled; acking batch.`
      );
      batch.ackAll();
      return;
    }

    await consumeSingle(definition.config, batch, env as QueueEnv<E>, executionCtx);
    return;
  }

  await consumeMulti(definition.jobs, definition.shared, batch, env as QueueEnv<E>, executionCtx);
}

async function consumeSingle<E>(
  config: AnyPushQueueConfig<E>,
  batch: MessageBatch<unknown>,
  env: QueueEnv<E>,
  executionCtx: ExecutionContext
): Promise<void> {
  if ('batchHandler' in config && config.batchHandler) {
    let ackOrRetryHandled = false;
    const batchCtx: BatchContext<E> = {
      env,
      executionCtx,
      batch: {
        queue: batch.queue,
        receivedAt: new Date(),
        firstMessageTimestamp: batch.messages[0]?.timestamp,
        ackAll: () => {
          ackOrRetryHandled = true;
          batch.ackAll();
        },
        retryAll: (options?: { delaySeconds?: number }) => {
          ackOrRetryHandled = true;
          batch.retryAll(options);
        }
      }
    };

    try {
      const typedMessages: ConsumerBatchEntry<unknown>[] = batch.messages.map((msg) => {
        const parsed = config.args.safeParse(msg.body);
        if (!parsed.success) {
          throw new Error(`Queue batch validation failed for ${msg.id}: ${parsed.error.message}`);
        }

        return {
          data: parsed.data,
          id: msg.id,
          timestamp: msg.timestamp,
          attempts: msg.attempts
        };
      });

      await config.batchHandler(batchCtx, typedMessages as never);
      if (!ackOrRetryHandled) {
        batch.ackAll();
      }
    } catch (error) {
      await callFailureHandler(config.onFailure as HandlerLike<BatchContext<E>>, batchCtx, null, error);
      if (!ackOrRetryHandled) {
        const retryOptions =
          config.retryDelay !== undefined
            ? { delaySeconds: parseDurationSeconds(config.retryDelay) }
            : undefined;
        batch.retryAll(retryOptions);
      }
    }
    return;
  }

  for (const message of batch.messages) {
    const queueCtx: QueueContext<E> = {
      env,
      executionCtx,
      message: {
        id: message.id,
        timestamp: message.timestamp,
        attempts: message.attempts,
        queue: batch.queue
      }
    };

    try {
      const parsed = config.args.safeParse(message.body);
      if (!parsed.success) {
        throw new Error(`Queue args validation failed: ${parsed.error.message}`);
      }

      await config.handler(queueCtx, parsed.data as never);
      message.ack();
    } catch (error) {
      await callFailureHandler(
        config.onFailure as HandlerLike<QueueContext<E>>,
        queueCtx,
        message.body,
        error
      );
      const retryOptions =
        config.retryDelay !== undefined
          ? { delaySeconds: parseDurationSeconds(config.retryDelay) }
          : undefined;
      message.retry(retryOptions);
    }
  }
}

async function consumeMulti<E>(
  jobs: Record<string, AnyJobConfig<E>>,
  shared: { retryDelay?: Duration },
  batch: MessageBatch<unknown>,
  env: QueueEnv<E>,
  executionCtx: ExecutionContext
): Promise<void> {
  for (const message of batch.messages) {
    const envelope = message.body as { _job?: string; data?: unknown };
    const jobName = envelope?._job;

    if (!jobName || !jobs[jobName]) {
      console.error(`[better-cf] Unknown job type for queue ${batch.queue}: ${String(jobName)}`);
      message.ack();
      continue;
    }

    const job = jobs[jobName];
    const queueCtx: QueueContext<E> = {
      env,
      executionCtx,
      message: {
        id: message.id,
        timestamp: message.timestamp,
        attempts: message.attempts,
        queue: batch.queue
      }
    };

    try {
      const parsed = job.args.safeParse(envelope.data);
      if (!parsed.success) {
        throw new Error(`Queue job validation failed for ${jobName}: ${parsed.error.message}`);
      }
      await job.handler(queueCtx, parsed.data);
      message.ack();
    } catch (error) {
      await callFailureHandler(
        job.onFailure as HandlerLike<QueueContext<E>>,
        queueCtx,
        envelope.data,
        error
      );
      const retryOptions =
        shared.retryDelay !== undefined
          ? { delaySeconds: parseDurationSeconds(shared.retryDelay) }
          : undefined;
      message.retry(retryOptions);
    }
  }
}

type HandlerLike<TContext> = ((ctx: TContext, args: unknown, error: Error) => Promise<void>) | undefined;

async function callFailureHandler<TContext>(
  handler: HandlerLike<TContext>,
  context: TContext,
  args: unknown,
  rawError: unknown
): Promise<void> {
  if (!handler) {
    return;
  }

  const error = rawError instanceof Error ? rawError : new Error(String(rawError));
  try {
    await handler(context, args, error);
  } catch {
    // Do not fail consume flow because failure hook failed.
  }
}
