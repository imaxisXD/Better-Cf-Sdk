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
  data: T;
  delay?: Duration;
  contentType?: ContentType;
}

/**
 * Context passed to per-message queue consumers.
 */
export interface QueueContext<E> {
  env: QueueEnv<E>;
  executionCtx: ExecutionContext;
  message: {
    id: string;
    timestamp: Date;
    attempts: number;
    queue: string;
  };
}

/**
 * Context passed to batch queue consumers.
 */
export interface BatchContext<E> {
  env: QueueEnv<E>;
  executionCtx: ExecutionContext;
  batch: {
    queue: string;
    receivedAt: Date;
    firstMessageTimestamp?: Date;
    ackAll: () => void;
    retryAll: (options?: { delaySeconds?: number }) => void;
  };
}

/**
 * Context passed to worker handlers.
 */
export interface WorkerContext<E> {
  env: QueueEnv<E>;
  executionCtx: ExecutionContext;
}

/**
 * Message shape received by batch consumers.
 */
export interface ConsumerBatchEntry<T> {
  data: T;
  id: string;
  timestamp: Date;
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
    maxSize?: number;
    timeout?: Duration;
    maxConcurrency?: number;
  };
}

/**
 * Pull consumer mode configuration.
 */
export interface PullConsumerConfig {
  /** Pull mode marker. */
  type: 'http_pull';
  /** Pull visibility timeout in seconds. */
  visibilityTimeout?: Duration;
}

/**
 * Per-message queue handler.
 */
export type QueueProcessHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E>,
  message: z.infer<TSchema>
) => Promise<void>;

/**
 * Batch queue handler.
 */
export type QueueBatchProcessHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: BatchContext<E>,
  messages: ConsumerBatchEntry<z.infer<TSchema>>[]
) => Promise<void>;

/**
 * Optional failure handler for queue processing.
 */
export type QueueFailureHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E> | BatchContext<E>,
  message: z.infer<TSchema> | null,
  error: Error
) => Promise<void>;

/**
 * Worker-consumer queue with per-message processing.
 */
export type QueueProcessConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  message: TSchema;
  consumer?: { type?: 'worker' };
  process: QueueProcessHandler<E, TSchema>;
  processBatch?: never;
  onFailure?: QueueFailureHandler<E, TSchema>;
};

/**
 * Worker-consumer queue with batch processing.
 */
export type QueueBatchConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  message: TSchema;
  consumer?: { type?: 'worker' };
  process?: never;
  processBatch: QueueBatchProcessHandler<E, TSchema>;
  onFailure?: QueueFailureHandler<E, TSchema>;
};

/**
 * HTTP pull consumer queue (producer-only declaration).
 */
export type QueuePullConfig<E, TSchema extends z.ZodTypeAny> = Omit<
  QueueCommonConfig,
  'visibilityTimeout' | 'batch'
> & {
  message: TSchema;
  consumer: PullConsumerConfig;
  batch?: never;
  visibilityTimeout?: never;
  process?: never;
  processBatch?: never;
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
  message: TSchema;
  process: (ctx: QueueContext<E>, message: z.infer<TSchema>) => Promise<void>;
  onFailure?: (
    ctx: QueueContext<E>,
    message: z.infer<TSchema>,
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
type MultiJobReservedKey =
  | keyof QueueCommonConfig
  | 'consumer'
  | 'message'
  | 'process'
  | 'processBatch'
  | 'onFailure';

type EnforceMultiJobEntries<E, TConfig extends Record<string, unknown>> = {
  [K in keyof TConfig]: K extends MultiJobReservedKey
    ? TConfig[K]
    : TConfig[K] extends AnyJobConfig<E>
      ? TConfig[K]
      : never;
};

type RequireAtLeastOneJob<TConfig extends Record<string, unknown>> = [
  Exclude<keyof TConfig, MultiJobReservedKey>
] extends [never]
  ? never
  : unknown;

export type MultiJobQueueConfig<E, TConfig extends Record<string, unknown>> = QueueCommonConfig & {
  consumer?: never;
  message?: never;
  process?: never;
  processBatch?: never;
  onFailure?: never;
} & TConfig &
  EnforceMultiJobEntries<E, TConfig> &
  RequireAtLeastOneJob<TConfig>;

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
      data: z.infer<TJobs[K]['message']>,
      options?: SendOptions
    ): Promise<void>;
    /** Sends many messages to a named job. */
    sendBatch(
      ctx: { env: QueueEnv<E> },
      messages: SendBatchEntry<z.infer<TJobs[K]['message']>>[],
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
  fetch(request: Request, env: E, executionCtx: ExecutionContext): Promise<Response>;
  scheduled?: (event: ScheduledEvent, env: E, executionCtx: ExecutionContext) => Promise<void>;
}

/**
 * Defines a worker module with typed queue-aware context.
 */
export type DefineWorker<E> = (config: WorkerConfig<E>) => WorkerEntrypoint<E>;

/**
 * Defines queue contracts and returns typed producer handles.
 */
export interface DefineQueue<E> {
  /**
   * Declare a single queue (worker consumer or http pull consumer).
   *
   * @example
   * defineQueue({
   *   message: z.object({ id: z.string() }),
   *   process: async (ctx, message) => {}
   * })
   */
  <TSchema extends z.ZodTypeAny>(config: QueueConfig<E, TSchema>): QueueHandle<E, z.infer<TSchema>>;

  /**
   * Declare a multi-job queue where each top-level key is a job definition.
   *
   * @example
   * defineQueue({
   *   email: { message: z.object({ to: z.string() }), process: async () => {} },
   *   audit: { message: z.object({ id: z.string() }), process: async () => {} }
   * })
   */
  <const TConfig extends Record<string, unknown>>(
    config: MultiJobQueueConfig<E, TConfig>
  ): MultiJobQueueHandle<E, ExtractJobMap<E, TConfig>>;
}

/**
 * SDK helpers returned by `createSDK`.
 */
export interface BetterCfSDK<E> {
  /** Queue declaration helper with schema-inferred producer types. */
  defineQueue: DefineQueue<E>;
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
  'consumer'
]);
