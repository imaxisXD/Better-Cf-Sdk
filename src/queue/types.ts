import type { z } from 'zod';

/**
 * Marker interface that generated env bindings extend.
 */
export interface BetterCfGeneratedBindings {}

/**
 * Default env type used when `createSDK()` is called without a generic.
 */
export interface BetterCfAutoEnv extends BetterCfGeneratedBindings {
  [binding: string]: unknown;
}

/**
 * Runtime env shape available inside queue and worker handlers.
 */
export type QueueEnv<E> = E & BetterCfGeneratedBindings;

/**
 * Duration in seconds/minutes/hours shorthand or raw seconds.
 */
export type Duration = number | `${number}s` | `${number}m` | `${number}h`;

/**
 * Cloudflare Queue message content type.
 */
export type ContentType = 'json' | 'text' | 'bytes' | 'v8';

/**
 * Per-message send options.
 */
export interface SendOptions {
  /** Delay before message becomes visible to consumers. */
  delay?: Duration;
  /** Explicit content type for Cloudflare queue delivery. */
  contentType?: ContentType;
}

/**
 * Shared send options for `sendBatch`.
 */
export type SendBatchOptions = SendOptions;

/**
 * Per-message input for `sendBatch`.
 */
export interface SendBatchEntry<T> {
  /** Payload to enqueue. */
  data: T;
  /** Per-message delay override (takes precedence over batch-level `options.delay`). */
  delay?: Duration;
  /** Per-message content type override (takes precedence over batch-level `options.contentType`). */
  contentType?: ContentType;
}

/**
 * Context passed to per-message queue consumers.
 */
export interface QueueContext<E> {
  /** Queue-aware runtime environment (`env` + generated bindings). */
  env: QueueEnv<E>;
  /** Cloudflare execution context. */
  executionCtx: ExecutionContext;
  /** Metadata for the currently processed message. */
  message: {
    /** Unique Cloudflare queue message id. */
    id: string;
    /** Message enqueue timestamp. */
    timestamp: Date;
    /** Delivery attempt count for this message. */
    attempts: number;
    /** Queue name currently being consumed. */
    queue: string;
  };
}

/**
 * Context passed to batch queue consumers.
 */
export interface BatchContext<E> {
  /** Queue-aware runtime environment (`env` + generated bindings). */
  env: QueueEnv<E>;
  /** Cloudflare execution context. */
  executionCtx: ExecutionContext;
  /** Batch metadata + helpers for explicit ack/retry control. */
  batch: {
    /** Queue name currently being consumed. */
    queue: string;
    /** When the batch was received by this worker invocation. */
    receivedAt: Date;
    /** Timestamp of first message in this batch (if present). */
    firstMessageTimestamp?: Date;
    /** Ack every message in the current batch. */
    ackAll: () => void;
    /** Retry every message in the current batch. */
    retryAll: (options?: { delaySeconds?: number }) => void;
  };
}

/**
 * Context passed to worker handlers.
 */
export interface WorkerContext<E> {
  /** Queue-aware runtime environment (`env` + generated bindings). */
  env: QueueEnv<E>;
  /** Cloudflare execution context. */
  executionCtx: ExecutionContext;
}

/**
 * Message shape received by batch consumers.
 */
export interface ConsumerBatchEntry<T> {
  /** Validated payload data. */
  data: T;
  /** Unique Cloudflare queue message id. */
  id: string;
  /** Message enqueue timestamp. */
  timestamp: Date;
  /** Delivery attempt count for this message. */
  attempts: number;
}

/**
 * Queue settings shared across worker-consumer and pull-consumer modes.
 */
export interface QueueCommonConfig {
  /** Number of retry attempts before dead-lettering. */
  retry?: number;
  /** Delay between retries. */
  retryDelay?: Duration;
  /** Dead-letter queue name. */
  deadLetter?: string;
  /** Delivery delay applied to newly sent messages. */
  deliveryDelay?: Duration;
  /** Message visibility timeout (worker consumer mode only). */
  visibilityTimeout?: Duration;
  /** Batch processing tuning (worker consumer mode only). */
  batch?: {
    /** Maximum number of messages per delivered batch. */
    maxSize?: number;
    /** Maximum time to wait before delivering a partial batch. */
    timeout?: Duration;
    /** Maximum concurrent batch invocations. */
    maxConcurrency?: number;
  };
}

/**
 * Pull consumer mode configuration.
 */
export interface PullConsumerConfig {
  /** Pull mode marker. */
  type: 'http_pull';
  /** Pull visibility timeout (seconds or duration shorthand). */
  visibilityTimeout?: Duration;
}

/**
 * Per-message queue handler.
 */
export type QueueHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E>,
  args: z.infer<TSchema>
) => Promise<void>;

/**
 * Batch queue handler.
 */
export type QueueBatchHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: BatchContext<E>,
  args: ConsumerBatchEntry<z.infer<TSchema>>[]
) => Promise<void>;

/**
 * Optional failure handler for queue processing.
 */
export type QueueFailureHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E> | BatchContext<E>,
  args: z.infer<TSchema> | null,
  error: Error
) => Promise<void>;

/**
 * Worker-consumer queue with per-message processing.
 */
export type QueueProcessConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  /** Zod schema used to validate each incoming payload. */
  args: TSchema;
  /** Optional explicit worker consumer marker. */
  consumer?: { type?: 'worker' };
  /** Per-message push handler. */
  handler: QueueHandler<E, TSchema>;
  /** Not allowed in single-message mode. */
  batchHandler?: never;
  /** Optional failure hook when `handler` throws or payload validation fails. */
  onFailure?: QueueFailureHandler<E, TSchema>;
};

/**
 * Worker-consumer queue with batch processing.
 */
export type QueueBatchConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  /** Zod schema used to validate each payload before `batchHandler` runs. */
  args: TSchema;
  /** Optional explicit worker consumer marker. */
  consumer?: { type?: 'worker' };
  /** Not allowed in batch mode. */
  handler?: never;
  /** Batch push handler. */
  batchHandler: QueueBatchHandler<E, TSchema>;
  /** Optional failure hook when `batchHandler` throws or batch validation fails. */
  onFailure?: QueueFailureHandler<E, TSchema>;
};

/**
 * HTTP pull consumer queue (producer-only declaration).
 */
export type QueuePullConfig<E, TSchema extends z.ZodTypeAny> = Omit<
  QueueCommonConfig,
  'visibilityTimeout' | 'batch'
> & {
  /** Zod schema for producer payload typing in pull mode. */
  args: TSchema;
  /** Required pull consumer configuration. */
  consumer: PullConsumerConfig;
  /** Not allowed in pull mode. */
  batch?: never;
  /** Not allowed in pull mode. */
  visibilityTimeout?: never;
  /** Not allowed in pull mode. */
  handler?: never;
  /** Not allowed in pull mode. */
  batchHandler?: never;
  /** Not allowed in pull mode. */
  onFailure?: never;
};

/**
 * Single-queue config union for worker and pull consumer modes.
 */
export type QueueConfig<E, TSchema extends z.ZodTypeAny> =
  | QueueProcessConfig<E, TSchema>
  | QueueBatchConfig<E, TSchema>
  | QueuePullConfig<E, TSchema>;

/**
 * Per-job declaration inside a multi-job queue.
 */
export interface JobConfig<E, TSchema extends z.ZodTypeAny> {
  /** Zod schema used to validate this job's payload. */
  args: TSchema;
  /** Job handler for this job key. */
  handler: (ctx: QueueContext<E>, args: z.infer<TSchema>) => Promise<void>;
  /** Optional failure hook for this job handler. */
  onFailure?: (
    ctx: QueueContext<E>,
    args: z.infer<TSchema>,
    error: Error
  ) => Promise<void>;
}

/**
 * Internal helper alias for any job config.
 */
export type AnyJobConfig<E> = JobConfig<E, z.ZodTypeAny>;

/**
 * Extracts only job keys from a multi-job config object.
 */
export type ExtractJobMap<E, TConfig extends Record<string, unknown>> = {
  [K in keyof TConfig as TConfig[K] extends AnyJobConfig<E> ? K : never]: TConfig[K] extends AnyJobConfig<E>
    ? TConfig[K]
    : never;
};

/**
 * Multi-job queue declaration object.
 */
export type MultiJobQueueConfig<E, TConfig extends Record<string, unknown>> = QueueCommonConfig & {
  /** Not allowed at top level in multi-job mode; define `args` per job key. */
  consumer?: never;
  /** Not allowed at top level in multi-job mode; define `args` per job key. */
  args?: never;
  /** Not allowed at top level in multi-job mode; define `handler` per job key. */
  handler?: never;
  /** Not allowed in multi-job mode. */
  batchHandler?: never;
  /** Not allowed at top level in multi-job mode; define `onFailure` per job key. */
  onFailure?: never;
} & TConfig;

/**
 * Producer handle for a single queue declaration.
 */
export interface QueueHandle<E, TMessage> {
  /** Sends one message to the queue. */
  send(ctx: { env: QueueEnv<E> }, data: TMessage, options?: SendOptions): Promise<void>;
  /** Sends multiple messages in one request. */
  sendBatch(
    ctx: { env: QueueEnv<E> },
    messages: SendBatchEntry<TMessage>[],
    options?: SendBatchOptions
  ): Promise<void>;
}

/**
 * Producer handles keyed by job name for a multi-job queue.
 */
export type MultiJobQueueHandle<
  E,
  TJobs extends Record<string, AnyJobConfig<E>>
> = {
  [K in keyof TJobs]: {
    /** Sends one message to a named job. */
    send(
      ctx: { env: QueueEnv<E> },
      data: z.infer<TJobs[K]['args']>,
      options?: SendOptions
    ): Promise<void>;
    /** Sends many messages to a named job. */
    sendBatch(
      ctx: { env: QueueEnv<E> },
      messages: SendBatchEntry<z.infer<TJobs[K]['args']>>[],
      options?: SendBatchOptions
    ): Promise<void>;
  };
};

/**
 * Worker handlers used to define module exports.
 */
export interface WorkerConfig<E> {
  /** Main fetch handler. */
  fetch: (request: Request, ctx: WorkerContext<E>) => Promise<Response>;
  /** Optional scheduled handler. */
  scheduled?: (event: ScheduledEvent, ctx: WorkerContext<E>) => Promise<void>;
}

/**
 * Worker module shape returned by `defineWorker`.
 */
export interface WorkerEntrypoint<E> {
  /** Cloudflare module `fetch` entrypoint. */
  fetch(request: Request, env: E, executionCtx: ExecutionContext): Promise<Response>;
  /** Optional Cloudflare module `scheduled` entrypoint. */
  scheduled?: (event: ScheduledEvent, env: E, executionCtx: ExecutionContext) => Promise<void>;
}

/**
 * Defines a worker module with typed queue-aware context.
 */
export type DefineWorker<E> = (config: WorkerConfig<E>) => WorkerEntrypoint<E>;

/**
 * Defines a single queue contract and returns a typed producer handle.
 */
export interface DefineQueue<E> {
  /**
   * Declare a single queue (worker consumer or http pull consumer).
   *
   * @example
   * defineQueue({
   *   args: z.object({ id: z.string() }),
   *   handler: async (ctx, args) => {}
   * })
   *
   * @remarks
   * Use exactly one of `handler` or `batchHandler` for worker-consumer queues.
   */
  <TSchema extends z.ZodTypeAny>(config: QueueConfig<E, TSchema>): QueueHandle<E, z.infer<TSchema>>;
}

/**
 * Defines a multi-job queue contract and returns job-keyed producer handles.
 */
export interface DefineQueues<E> {
  /**
   * Declare a multi-job queue where each top-level key is a job definition.
   *
   * @example
   * defineQueues({
   *   email: { args: z.object({ to: z.string() }), handler: async () => {} },
   *   audit: { args: z.object({ id: z.string() }), handler: async () => {} }
   * })
   *
   * @remarks
   * Shared queue settings (for example `retry`, `retryDelay`, `batch`) stay at the top level.
   */
  <const TConfig extends Record<string, unknown>>(
    config: MultiJobQueueConfig<E, TConfig>
  ): MultiJobQueueHandle<E, ExtractJobMap<E, TConfig>>;
}

/**
 * Internal helper type that supports both single and multi-job queue declarations.
 */
export interface DefineAnyQueue<E> extends DefineQueue<E>, DefineQueues<E> {}

/**
 * SDK helpers returned by `createSDK`.
 */
export interface BetterCfSDK<E> {
  /** Single-queue helper. */
  defineQueue: DefineQueue<E>;
  /** Multi-job helper where each top-level key is a job declaration. */
  defineQueues: DefineQueues<E>;
  /** Worker declaration helper that maps to Cloudflare module handlers. */
  defineWorker: DefineWorker<E>;
}

/**
 * Internal helper alias for any queue config mode.
 */
export type AnyQueueConfig<E> = QueueConfig<E, z.ZodTypeAny>;
/**
 * Internal helper alias for worker-consumer queue modes.
 */
export type AnyPushQueueConfig<E> = QueueProcessConfig<E, z.ZodTypeAny> | QueueBatchConfig<E, z.ZodTypeAny>;
/**
 * Internal helper alias for pull-consumer queue mode.
 */
export type AnyPullQueueConfig<E> = QueuePullConfig<E, z.ZodTypeAny>;

/**
 * Internal helper alias for any multi-job queue config.
 */
export type AnyMultiJobQueueConfig<E> = MultiJobQueueConfig<E, Record<string, unknown>>;

/**
 * Normalized queue definition used by runtime internals.
 */
export type QueueDefinition<E> =
  | { kind: 'single'; mode: 'push'; config: AnyPushQueueConfig<E> }
  | { kind: 'single'; mode: 'pull'; config: AnyPullQueueConfig<E> }
  | {
      kind: 'multi';
      jobs: Record<string, AnyJobConfig<E>>;
      shared: QueueCommonConfig;
    };

/**
 * Reserved top-level keys treated as shared config in multi-job mode.
 */
export const RESERVED_MULTI_JOB_KEYS = new Set([
  'retry',
  'retryDelay',
  'deadLetter',
  'deliveryDelay',
  'visibilityTimeout',
  'batch',
  'consumer',
  'args',
  'handler',
  'batchHandler',
  'onFailure',
  'message',
  'process',
  'processBatch'
]);
