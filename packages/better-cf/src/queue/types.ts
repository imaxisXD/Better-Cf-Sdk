import type { z } from 'zod';

export interface BetterCfGeneratedBindings {}

export interface BetterCfAutoEnv extends BetterCfGeneratedBindings {
  [binding: string]: unknown;
}

export type QueueEnv<E> = E & BetterCfGeneratedBindings;

export type Duration = number | `${number}s` | `${number}m` | `${number}h`;

export type ContentType = 'json' | 'text' | 'bytes' | 'v8';

export interface SendOptions {
  delay?: Duration;
  contentType?: ContentType;
}

export type SendBatchOptions = SendOptions;

export interface SendBatchEntry<T> {
  data: T;
  delay?: Duration;
  contentType?: ContentType;
}

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

export interface WorkerContext<E> {
  env: QueueEnv<E>;
  executionCtx: ExecutionContext;
}

export interface ConsumerBatchEntry<T> {
  data: T;
  id: string;
  timestamp: Date;
  attempts: number;
}

export interface QueueCommonConfig {
  retry?: number;
  retryDelay?: Duration;
  deadLetter?: string;
  deliveryDelay?: Duration;
  visibilityTimeout?: Duration;
  batch?: {
    maxSize?: number;
    timeout?: Duration;
    maxConcurrency?: number;
  };
}

export interface PullConsumerConfig {
  type: 'http_pull';
  visibilityTimeout?: Duration;
}

export type QueueProcessHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E>,
  message: z.infer<TSchema>
) => Promise<void>;

export type QueueBatchProcessHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: BatchContext<E>,
  messages: ConsumerBatchEntry<z.infer<TSchema>>[]
) => Promise<void>;

export type QueueFailureHandler<E, TSchema extends z.ZodTypeAny> = (
  ctx: QueueContext<E> | BatchContext<E>,
  message: z.infer<TSchema> | null,
  error: Error
) => Promise<void>;

export type QueueProcessConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  message: TSchema;
  consumer?: { type?: 'worker' };
  process: QueueProcessHandler<E, TSchema>;
  processBatch?: never;
  onFailure?: QueueFailureHandler<E, TSchema>;
};

export type QueueBatchConfig<E, TSchema extends z.ZodTypeAny> = QueueCommonConfig & {
  message: TSchema;
  consumer?: { type?: 'worker' };
  process?: never;
  processBatch: QueueBatchProcessHandler<E, TSchema>;
  onFailure?: QueueFailureHandler<E, TSchema>;
};

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

export type QueueConfig<E, TSchema extends z.ZodTypeAny> =
  | QueueProcessConfig<E, TSchema>
  | QueueBatchConfig<E, TSchema>
  | QueuePullConfig<E, TSchema>;

export interface JobConfig<E, TSchema extends z.ZodTypeAny> {
  message: TSchema;
  process: (ctx: QueueContext<E>, message: z.infer<TSchema>) => Promise<void>;
  onFailure?: (
    ctx: QueueContext<E>,
    message: z.infer<TSchema>,
    error: Error
  ) => Promise<void>;
}

export type AnyJobConfig<E> = JobConfig<E, z.ZodTypeAny>;

export type ExtractJobMap<E, TConfig extends Record<string, unknown>> = {
  [K in keyof TConfig as TConfig[K] extends AnyJobConfig<E> ? K : never]: TConfig[K] extends AnyJobConfig<E>
    ? TConfig[K]
    : never;
};

export type MultiJobQueueConfig<E, TConfig extends Record<string, unknown>> = QueueCommonConfig & {
  consumer?: never;
} & TConfig;

export interface QueueHandle<E, TMessage> {
  send(ctx: { env: QueueEnv<E> }, data: TMessage, options?: SendOptions): Promise<void>;
  sendBatch(
    ctx: { env: QueueEnv<E> },
    messages: SendBatchEntry<TMessage>[],
    options?: SendBatchOptions
  ): Promise<void>;
}

export type MultiJobQueueHandle<
  E,
  TJobs extends Record<string, AnyJobConfig<E>>
> = {
  [K in keyof TJobs]: {
    send(
      ctx: { env: QueueEnv<E> },
      data: z.infer<TJobs[K]['message']>,
      options?: SendOptions
    ): Promise<void>;
    sendBatch(
      ctx: { env: QueueEnv<E> },
      messages: SendBatchEntry<z.infer<TJobs[K]['message']>>[],
      options?: SendBatchOptions
    ): Promise<void>;
  };
};

export interface WorkerConfig<E> {
  fetch: (request: Request, ctx: WorkerContext<E>) => Promise<Response>;
  scheduled?: (event: ScheduledEvent, ctx: WorkerContext<E>) => Promise<void>;
}

export type AnyQueueConfig<E> = QueueConfig<E, z.ZodTypeAny>;
export type AnyPushQueueConfig<E> = QueueProcessConfig<E, z.ZodTypeAny> | QueueBatchConfig<E, z.ZodTypeAny>;
export type AnyPullQueueConfig<E> = QueuePullConfig<E, z.ZodTypeAny>;

export type AnyMultiJobQueueConfig<E> = MultiJobQueueConfig<E, Record<string, unknown>>;

export type QueueDefinition<E> =
  | { kind: 'single'; mode: 'push'; config: AnyPushQueueConfig<E> }
  | { kind: 'single'; mode: 'pull'; config: AnyPullQueueConfig<E> }
  | {
      kind: 'multi';
      jobs: Record<string, AnyJobConfig<E>>;
      shared: QueueCommonConfig;
    };

export const RESERVED_MULTI_JOB_KEYS = new Set([
  'retry',
  'retryDelay',
  'deadLetter',
  'deliveryDelay',
  'visibilityTimeout',
  'batch',
  'consumer'
]);
