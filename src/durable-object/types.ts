import type { z } from 'zod';

export interface BetterCfGeneratedBindings {}

export interface BetterCfGeneratedApi {}

export interface BetterCfAutoEnv extends BetterCfGeneratedBindings {
  [binding: string]: unknown;
}

export type RuntimeEnv<E> = E & BetterCfGeneratedBindings;

export type RuntimeApi = BetterCfGeneratedApi;

export type Duration = number | `${number}s` | `${number}m` | `${number}h`;

export type ContentType = 'json' | 'text' | 'bytes' | 'v8';

export interface SendOptions {
  delay?: Duration;
  contentType?: ContentType;
}

export interface SendBatchEntry<T> {
  data: T;
  delay?: Duration;
  contentType?: ContentType;
}

export interface BaseExecutionContext<E> {
  env: RuntimeEnv<E>;
  executionCtx: ExecutionContext;
  api: RuntimeApi;
}

export interface WorkerContext<E> extends BaseExecutionContext<E> {}

export interface QueueMessageContext<E> extends BaseExecutionContext<E> {
  message: {
    id: string;
    timestamp: Date;
    attempts: number;
    queue: string;
  };
}

export interface QueueBatchContext<E> extends BaseExecutionContext<E> {
  batch: {
    queue: string;
    receivedAt: Date;
    firstMessageTimestamp?: Date;
    ackAll: () => void;
    retryAll: (options?: { delaySeconds?: number }) => void;
  };
}

export interface DurableBaseContext<E> extends BaseExecutionContext<E> {
  state: DurableObjectState;
  storage: DurableObjectStorage;
  sql: DurableObjectStorage['sql'];
}

export interface DurableFetchContext<E> extends DurableBaseContext<E> {
  request: Request;
}

export interface DurableAlarmContext<E> extends DurableBaseContext<E> {
  alarmInfo: AlarmInvocationInfo;
}

export interface DurableWebSocketConnectContext<E, TAttachment> extends DurableBaseContext<E> {
  request: Request;
  client: WebSocket;
  server: WebSocket;
  accept: (options?: { tags?: string[]; attachment?: TAttachment }) => void;
}

export interface DurableWebSocketEventContext<E, TAttachment> extends DurableBaseContext<E> {
  socket: WebSocket;
  attachment: TAttachment | undefined;
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

export interface QueueConfig<TSchema extends z.ZodTypeAny> extends QueueCommonConfig {
  args: TSchema;
  description?: string;
  consumer?: { type?: 'worker' } | PullConsumerConfig;
}

export interface QueueJobConfig<TSchema extends z.ZodTypeAny> {
  args: TSchema;
  description?: string;
}

export type MultiJobQueueConfig<TConfig extends Record<string, unknown>> = QueueCommonConfig & {
  description?: string;
  consumer?: never;
  args?: never;
} & TConfig;

export interface QueueMessageConsumerConfig<E, TMessage> {
  description?: string;
  handler: (ctx: QueueMessageContext<E>, args: TMessage) => Promise<void> | void;
  failure?: (ctx: QueueMessageContext<E>, args: TMessage | null, error: Error) => Promise<void> | void;
}

export interface QueueBatchConsumerConfig<E, TMessage> {
  description?: string;
  handler: (ctx: QueueBatchContext<E>, args: ConsumerBatchEntry<TMessage>[]) => Promise<void> | void;
  failure?: (
    ctx: QueueBatchContext<E>,
    args: ConsumerBatchEntry<TMessage>[] | null,
    error: Error
  ) => Promise<void> | void;
}

export interface ConsumerBatchEntry<T> {
  data: T;
  id: string;
  timestamp: Date;
  attempts: number;
}

export interface DurableObjectConfig<TKeySchema extends z.ZodTypeAny> {
  name: string;
  key: TKeySchema;
  version?: number;
  description?: string;
}

export interface DurableFnConfig<E, TArgsSchema extends z.ZodTypeAny, TReturn> {
  args: TArgsSchema;
  returns?: z.ZodType<TReturn>;
  description?: string;
  handler: (ctx: DurableBaseContext<E>, args: z.infer<TArgsSchema>) => Promise<TReturn> | TReturn;
}

export interface DurableFetchConfig<E> {
  description?: string;
  handler: (ctx: DurableFetchContext<E>) => Promise<Response> | Response;
}

export interface DurableAlarmConfig<E> {
  description?: string;
  handler: (ctx: DurableAlarmContext<E>) => Promise<void> | void;
}

export interface DurableInitConfig<E> {
  description?: string;
  handler: (ctx: DurableBaseContext<E>) => Promise<void> | void;
}

export interface DurableWebSocketConfig<E, TAttachment = unknown> {
  description?: string;
  connect?: (
    ctx: DurableWebSocketConnectContext<E, TAttachment>
  ) => Promise<Response | void> | Response | void;
  message?: (
    ctx: DurableWebSocketEventContext<E, TAttachment>,
    message: string | ArrayBuffer
  ) => Promise<void> | void;
  close?: (
    ctx: DurableWebSocketEventContext<E, TAttachment>,
    code: number,
    reason: string,
    wasClean: boolean
  ) => Promise<void> | void;
  error?: (
    ctx: DurableWebSocketEventContext<E, TAttachment>,
    error: unknown
  ) => Promise<void> | void;
  serializeAttachment?: (attachment: TAttachment) => unknown;
  hydrateAttachment?: (attachment: unknown) => TAttachment;
}

export interface WorkerConfig<E> {
  fetch: (request: Request, ctx: WorkerContext<E>) => Promise<Response>;
  scheduled?: (event: ScheduledEvent, ctx: WorkerContext<E>) => Promise<void>;
}

export interface WorkerEntrypoint<E> {
  fetch(request: Request, env: E, executionCtx: ExecutionContext): Promise<Response>;
  scheduled?: (event: ScheduledEvent, env: E, executionCtx: ExecutionContext) => Promise<void>;
}

export interface QueueHandle<E, TMessage> {
  message(config: QueueMessageConsumerConfig<E, TMessage>): QueueConsumerRef<TMessage>;
  batch(config: QueueBatchConsumerConfig<E, TMessage>): QueueBatchConsumerRef<TMessage>;
}

export interface QueueJobHandle<E, TMessage> {
  message(config: QueueMessageConsumerConfig<E, TMessage>): QueueJobConsumerRef<TMessage>;
}

export type MultiJobQueueHandle<
  E,
  TJobs extends Record<string, QueueJobConfig<z.ZodTypeAny>>
> = {
  [K in keyof TJobs]: QueueJobHandle<E, z.infer<TJobs[K]['args']>>;
};

export interface DurableObjectHandle<E, TKey> {
  fn<TArgsSchema extends z.ZodTypeAny, TReturn>(
    config: DurableFnConfig<E, TArgsSchema, TReturn>
  ): DurableFnRef<TKey, z.infer<TArgsSchema>, TReturn>;
  internal<TArgsSchema extends z.ZodTypeAny, TReturn>(
    config: DurableFnConfig<E, TArgsSchema, TReturn>
  ): DurableFnRef<TKey, z.infer<TArgsSchema>, TReturn>;
  fetch(config: DurableFetchConfig<E>): DurableFetchRef;
  alarm(config: DurableAlarmConfig<E>): DurableAlarmRef;
  init(config: DurableInitConfig<E>): DurableInitRef;
  websocket<TAttachment = unknown>(config: DurableWebSocketConfig<E, TAttachment>): DurableWebSocketRef<TAttachment>;
}

export interface QueueConsumerRef<TMessage> {
  readonly __type?: 'queue-message';
  readonly __message?: TMessage;
}

export interface QueueBatchConsumerRef<TMessage> {
  readonly __type?: 'queue-batch';
  readonly __message?: TMessage;
}

export interface QueueJobConsumerRef<TMessage> {
  readonly __type?: 'queue-job-message';
  readonly __message?: TMessage;
}

export interface DurableFnRef<TKey, TArgs, TReturn> {
  readonly __type?: 'durable-fn';
  readonly __key?: TKey;
  readonly __args?: TArgs;
  readonly __return?: TReturn;
}

export interface DurableFetchRef {
  readonly __type?: 'durable-fetch';
}

export interface DurableAlarmRef {
  readonly __type?: 'durable-alarm';
}

export interface DurableInitRef {
  readonly __type?: 'durable-init';
}

export interface DurableWebSocketRef<TAttachment> {
  readonly __type?: 'durable-websocket';
  readonly __attachment?: TAttachment;
}

export type QueuePayload<TQueue> = TQueue extends QueueHandle<any, infer TMessage> ? TMessage : never;

export type QueueJobPayload<TJob> = TJob extends QueueJobHandle<any, infer TMessage> ? TMessage : never;

export type DurableObjectKey<TObject> = TObject extends DurableObjectHandle<any, infer TKey> ? TKey : never;

export type DurableFnKey<TFn> = TFn extends DurableFnRef<infer TKey, any, any> ? TKey : never;

export type DurableFnArgs<TFn> = TFn extends DurableFnRef<any, infer TArgs, any> ? TArgs : never;

export type DurableFnReturn<TFn> = TFn extends DurableFnRef<any, any, infer TReturn> ? TReturn : never;

export interface DefineDurableObject<E> {
  <TKeySchema extends z.ZodTypeAny>(
    config: DurableObjectConfig<TKeySchema>
  ): DurableObjectHandle<E, z.infer<TKeySchema>>;
}

export interface DefineQueue<E> {
  <TSchema extends z.ZodTypeAny>(config: QueueConfig<TSchema>): QueueHandle<E, z.infer<TSchema>>;
}

export interface DefineQueues<E> {
  <const TConfig extends Record<string, unknown>>(
    config: MultiJobQueueConfig<TConfig>
  ): MultiJobQueueHandle<E, ExtractQueueJobs<TConfig>>;
}

export type ExtractQueueJobs<TConfig extends Record<string, unknown>> = {
  [K in keyof TConfig as TConfig[K] extends QueueJobConfig<z.ZodTypeAny> ? K : never]: TConfig[K] extends QueueJobConfig<
    z.ZodTypeAny
  >
    ? TConfig[K]
    : never;
};

export interface DefineWorker<E> {
  (config: WorkerConfig<E>): WorkerEntrypoint<E>;
}

export interface BetterCfSDK<E> {
  defineDurableObject: DefineDurableObject<E>;
  defineQueue: DefineQueue<E>;
  defineQueues: DefineQueues<E>;
  defineWorker: DefineWorker<E>;
}
