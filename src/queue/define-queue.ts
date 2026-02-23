import { consumeQueueDefinition } from './consumer.js';
import { getQueueInternals, kQueueInternals } from './internal.js';
import {
  RESERVED_MULTI_JOB_KEYS,
  type AnyMultiJobQueueConfig,
  type AnyPullQueueConfig,
  type AnyPushQueueConfig,
  type DefineQueue,
  type DefineQueues,
  type ExtractJobMap,
  type JobConfig,
  type MultiJobQueueConfig,
  type MultiJobQueueHandle,
  type QueueConfig,
  type QueueDefinition,
  type QueueHandle,
  type SendBatchEntry,
  type SendBatchOptions,
  type SendOptions
} from './types.js';
import { isPlainObject, mergeSendOptions, toCloudflareSendOptions } from './utils.js';
import type { z } from 'zod';

const LEGACY_SCHEMA_KEY = 'message';
const LEGACY_SINGLE_HANDLER_KEYS = ['process', 'processBatch'] as const;

/**
 * Creates a typed `defineQueue` helper bound to the SDK env generic.
 */
export function defineQueueFactory<E>(): DefineQueue<E> {
  return function defineQueue<TSchema extends z.ZodTypeAny>(
    config: QueueConfig<E, TSchema>
  ): QueueHandle<E, z.infer<TSchema>> {
    assertNoLegacySingleQueueKeys(config);
    const definition = toSingleQueueDefinition(config as QueueConfig<E, z.ZodTypeAny>);
    return createQueueHandle(definition) as QueueHandle<E, z.infer<TSchema>>;
  };
}

/**
 * Creates a typed `defineQueues` helper bound to the SDK env generic.
 */
export function defineQueuesFactory<E>(): DefineQueues<E> {
  return function defineQueues<const TConfig extends Record<string, unknown>>(
    config: MultiJobQueueConfig<E, TConfig>
  ): MultiJobQueueHandle<E, ExtractJobMap<E, TConfig>> {
    assertNoLegacyMultiQueueKeys(config as AnyMultiJobQueueConfig<E>);
    const definition = toMultiQueueDefinition(config as AnyMultiJobQueueConfig<E>);
    return createQueueHandle(definition) as MultiJobQueueHandle<E, ExtractJobMap<E, TConfig>>;
  };
}

function createQueueHandle<E>(
  definition: QueueDefinition<E>
): QueueHandle<E, unknown> | MultiJobQueueHandle<E, Record<string, JobConfig<E, z.ZodTypeAny>>> {
  let bindingName: string | null = null;

  const sendBase = async (ctx: { env: E }, body: unknown, options?: SendOptions): Promise<void> => {
    if (!bindingName) {
      throw new Error('Queue binding not initialized. Run through better-cf dev/generate/deploy generated entry.');
    }

    const binding = (ctx.env as Record<string, unknown>)[bindingName] as
      | {
          send: (value: unknown, opts?: { delaySeconds?: number; contentType?: SendOptions['contentType'] }) => Promise<void>;
        }
      | undefined;

    if (!binding || typeof binding.send !== 'function') {
      throw new Error(`Queue binding ${bindingName} not found in env.`);
    }

    await binding.send(body, toCloudflareSendOptions(options));
  };

  const sendBatchBase = async (
    ctx: { env: E },
    messages: Array<{ body: unknown; options?: SendOptions }>
  ): Promise<void> => {
    if (!bindingName) {
      throw new Error('Queue binding not initialized. Run through better-cf dev/generate/deploy generated entry.');
    }

    const binding = (ctx.env as Record<string, unknown>)[bindingName] as
      | {
          sendBatch: (entries: Array<{ body: unknown; delaySeconds?: number; contentType?: SendOptions['contentType'] }>) => Promise<void>;
        }
      | undefined;

    if (!binding || typeof binding.sendBatch !== 'function') {
      throw new Error(`Queue binding ${bindingName} not found in env.`);
    }

    const payload = messages.map((item) => ({
      body: item.body,
      ...toCloudflareSendOptions(item.options)
    }));
    await binding.sendBatch(payload);
  };

  const baseHandle: Record<string | symbol, unknown> = {
    async send(ctx: { env: E }, data: unknown, options?: SendOptions): Promise<void> {
      if (definition.kind === 'single') {
        await sendBase(ctx, data, options);
        return;
      }

      await sendBase(ctx, { _job: '__default', data }, options);
    },

    async sendBatch(
      ctx: { env: E },
      messages: SendBatchEntry<unknown>[],
      options?: SendBatchOptions
    ): Promise<void> {
      if (definition.kind === 'single') {
        await sendBatchBase(
          ctx,
          messages.map((message) => ({
            body: message.data,
            options: mergeSendOptions(message, options)
          }))
        );
        return;
      }

      await sendBatchBase(
        ctx,
        messages.map((message) => ({
          body: { _job: '__default', data: message.data },
          options: mergeSendOptions(message, options)
        }))
      );
    }
  };

  if (definition.kind === 'multi') {
    for (const jobName of Object.keys(definition.jobs)) {
      baseHandle[jobName] = {
        async send(ctx: { env: E }, data: unknown, options?: SendOptions) {
          await sendBase(ctx, { _job: jobName, data }, options);
        },
        async sendBatch(
          ctx: { env: E },
          messages: SendBatchEntry<unknown>[],
          options?: SendBatchOptions
        ) {
          await sendBatchBase(
            ctx,
            messages.map((message) => ({
              body: { _job: jobName, data: message.data },
              options: mergeSendOptions(message, options)
            }))
          );
        }
      };
    }
  }

  Object.defineProperty(baseHandle, kQueueInternals, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {
      setBinding(name: string) {
        bindingName = name;
      },
      getBinding() {
        return bindingName;
      },
      getDefinition() {
        return definition;
      },
      consume(batch: MessageBatch<unknown>, env: E, executionCtx: ExecutionContext) {
        return consumeQueueDefinition(definition, batch, env, executionCtx);
      }
    }
  });

  return baseHandle as unknown as QueueHandle<E, unknown>;
}

/**
 * Attaches the generated Cloudflare binding name to a queue handle.
 */
export function setQueueBinding<E>(handle: unknown, binding: string): void {
  getQueueInternals<E>(handle).setBinding(binding);
}

/**
 * Reads normalized queue metadata from a queue handle.
 */
export function readQueueDefinition<E>(handle: unknown): QueueDefinition<E> {
  return getQueueInternals<E>(handle).getDefinition();
}

function toSingleQueueDefinition<E>(config: QueueConfig<E, z.ZodTypeAny>): QueueDefinition<E> {
  if (isPullQueue(config)) {
    if ('handler' in config || 'batchHandler' in config) {
      throw new Error('Queue config with consumer.type="http_pull" cannot define handler/batchHandler.');
    }
    return {
      kind: 'single',
      mode: 'pull',
      config: config as AnyPullQueueConfig<E>
    };
  }

  if (hasHandler(config) && hasBatchHandler(config)) {
    throw new Error('Queue config cannot define both handler and batchHandler.');
  }

  if (!hasHandler(config) && !hasBatchHandler(config)) {
    throw new Error('Queue config must define one of handler or batchHandler in worker consumer mode.');
  }

  return {
    kind: 'single',
    mode: 'push',
    config: config as AnyPushQueueConfig<E>
  };
}

function toMultiQueueDefinition<E>(config: AnyMultiJobQueueConfig<E>): QueueDefinition<E> {
  const shared = {
    retry: config.retry,
    retryDelay: config.retryDelay,
    deadLetter: config.deadLetter,
    deliveryDelay: config.deliveryDelay,
    visibilityTimeout: config.visibilityTimeout,
    batch: config.batch
  };

  const jobs: Record<string, JobConfig<E, z.ZodTypeAny>> = {};
  for (const [key, value] of Object.entries(config)) {
    if (RESERVED_MULTI_JOB_KEYS.has(key)) {
      continue;
    }

    if (hasLegacyKeys(value)) {
      throw new Error(
        `Multi-job queue "${key}" uses legacy keys. Rename message->args and process/processBatch->handler/batchHandler.`
      );
    }

    if (isPlainObject(value) && 'batchHandler' in value) {
      throw new Error(`Multi-job queue "${key}" cannot define batchHandler. Use handler per job.`);
    }

    if (isJobConfig(value)) {
      jobs[key] = value;
    }
  }

  if (Object.keys(jobs).length === 0) {
    throw new Error('Multi-job queue config must define at least one job.');
  }

  return {
    kind: 'multi',
    jobs,
    shared
  };
}

function isPullQueue<E>(config: QueueConfig<E, z.ZodTypeAny>): boolean {
  return 'consumer' in config && Boolean(config.consumer && config.consumer.type === 'http_pull');
}

function hasHandler<E>(config: QueueConfig<E, z.ZodTypeAny>): boolean {
  return 'handler' in config && typeof config.handler === 'function';
}

function hasBatchHandler<E>(config: QueueConfig<E, z.ZodTypeAny>): boolean {
  return 'batchHandler' in config && typeof config.batchHandler === 'function';
}

function isJobConfig<E>(value: unknown): value is JobConfig<E, z.ZodTypeAny> {
  if (!isPlainObject(value)) {
    return false;
  }

  return 'args' in value && 'handler' in value;
}

function assertNoLegacySingleQueueKeys(config: unknown): void {
  if (!isPlainObject(config)) {
    return;
  }

  const legacyKeys = [LEGACY_SCHEMA_KEY, ...LEGACY_SINGLE_HANDLER_KEYS].filter((key) => key in config);
  if (legacyKeys.length === 0) {
    return;
  }

  throw new Error(
    `Queue config uses legacy keys (${legacyKeys.join(', ')}). Rename message->args, process->handler, processBatch->batchHandler.`
  );
}

function assertNoLegacyMultiQueueKeys(config: AnyMultiJobQueueConfig<unknown>): void {
  const topLevelLegacyKeys = [LEGACY_SCHEMA_KEY, ...LEGACY_SINGLE_HANDLER_KEYS].filter((key) => key in config);
  if (topLevelLegacyKeys.length > 0) {
    throw new Error(
      `Multi-job queue config uses legacy keys (${topLevelLegacyKeys.join(', ')}). Use defineQueues({ job: { args, handler } }).`
    );
  }

  for (const [jobName, value] of Object.entries(config)) {
    if (RESERVED_MULTI_JOB_KEYS.has(jobName) || !isPlainObject(value)) {
      continue;
    }

    if (hasLegacyKeys(value)) {
      throw new Error(
        `Multi-job queue "${jobName}" uses legacy keys. Rename message->args and process/processBatch->handler/batchHandler.`
      );
    }
  }
}

function hasLegacyKeys(value: unknown): boolean {
  if (!isPlainObject(value)) {
    return false;
  }

  return LEGACY_SCHEMA_KEY in value || LEGACY_SINGLE_HANDLER_KEYS.some((key) => key in value);
}
