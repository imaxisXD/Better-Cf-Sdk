import { parseDurationSeconds, toCloudflareSendOptions } from '../queue/utils.js';
import type {
  BetterCfGeneratedApi,
  BetterCfGeneratedBindings,
  BetterCfSDK,
  DurableAlarmConfig,
  DurableBaseContext,
  DurableFetchConfig,
  DurableFnConfig,
  DurableObjectConfig,
  DurableWebSocketConfig,
  MultiJobQueueConfig,
  PullConsumerConfig,
  QueueBatchConsumerConfig,
  QueueConfig,
  QueueJobConfig,
  QueueMessageConsumerConfig,
  RuntimeEnv,
  WorkerConfig,
  WorkerContext
} from './types.js';
import type { z } from 'zod';

export const kDurableObjectInternals = Symbol.for('better-cf.durable-object.definition');
export const kDurableRegistrationInternals = Symbol.for('better-cf.durable-object.registration');
export const kQueueDefinitionInternals = Symbol.for('better-cf.durable-object.queue.definition');
export const kQueueConsumerInternals = Symbol.for('better-cf.durable-object.queue.consumer');
export const kWorkerInternals = Symbol.for('better-cf.durable-object.worker');

type ApiFactory = (env: unknown, executionCtx: ExecutionContext) => BetterCfGeneratedApi;

let apiFactory: ApiFactory | null = null;

export function setGeneratedApiFactory(factory: ApiFactory): void {
  apiFactory = factory;
}

export function createRuntimeContext<E>(env: E, executionCtx: ExecutionContext): WorkerContext<E> {
  return {
    env: env as RuntimeEnv<E>,
    executionCtx,
    api: (apiFactory?.(env, executionCtx) ?? {}) as BetterCfGeneratedApi
  };
}

export interface DurableObjectInternal<TKey> {
  config: DurableObjectConfig<z.ZodType<TKey>>;
  keySchema: z.ZodType<TKey>;
  serializeKey: (value: TKey) => string;
}

export interface DurableFunctionInternal<E, TKey, TArgs, TReturn> {
  visibility: 'public' | 'internal';
  config: DurableFnConfig<E, z.ZodType<TArgs>, TReturn>;
}

export interface DurableFetchInternal<E> {
  config: DurableFetchConfig<E>;
}

export interface DurableAlarmInternal<E> {
  config: DurableAlarmConfig<E>;
}

export interface DurableInitInternal<E> {
  config: { description?: string; handler: (ctx: DurableBaseContext<E>) => Promise<void> | void };
}

export interface DurableWebSocketInternal<E, TAttachment> {
  config: DurableWebSocketConfig<E, TAttachment>;
}

type PushQueueConsumerType = 'message' | 'batch' | 'job-message';

export interface QueueDefinitionInternal {
  kind: 'single' | 'multi';
  config: QueueConfig<z.ZodTypeAny> | MultiJobQueueConfig<Record<string, unknown>>;
  bindingName: string | null;
  setBinding: (bindingName: string) => void;
  getBinding: () => string | null;
}

export interface QueueConsumerInternal<E> {
  type: PushQueueConsumerType;
  queue: unknown;
  jobName?: string;
  config: QueueMessageConsumerConfig<E, unknown> | QueueBatchConsumerConfig<E, unknown>;
}

export interface WorkerInternal<E> {
  config: WorkerConfig<E>;
}

export function normalizeKey(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  return JSON.stringify(value);
}

export function makeDurableBaseContext<E>(
  env: E,
  executionCtx: ExecutionContext,
  state: DurableObjectState
): DurableBaseContext<E> {
  const runtime = createRuntimeContext(env, executionCtx);
  return {
    ...runtime,
    state,
    storage: state.storage,
    sql: state.storage.sql
  };
}

export function getDurableObjectInternals<TKey>(value: unknown): DurableObjectInternal<TKey> {
  if (!value || typeof value !== 'object') {
    throw new Error('Value is not a durable object definition.');
  }

  const internals = (value as Record<PropertyKey, unknown>)[kDurableObjectInternals];
  if (!internals) {
    throw new Error('Object is not a better-cf durable object handle.');
  }

  return internals as DurableObjectInternal<TKey>;
}

export function getDurableRegistrationInternals(value: unknown):
  | DurableFunctionInternal<unknown, unknown, unknown, unknown>
  | DurableFetchInternal<unknown>
  | DurableAlarmInternal<unknown>
  | DurableInitInternal<unknown>
  | DurableWebSocketInternal<unknown, unknown> {
  if (!value || typeof value !== 'object') {
    throw new Error('Value is not a durable object registration.');
  }

  const internals = (value as Record<PropertyKey, unknown>)[kDurableRegistrationInternals];
  if (!internals) {
    throw new Error('Object is not a better-cf durable object registration.');
  }

  return internals as
    | DurableFunctionInternal<unknown, unknown, unknown, unknown>
    | DurableFetchInternal<unknown>
    | DurableAlarmInternal<unknown>
    | DurableInitInternal<unknown>
    | DurableWebSocketInternal<unknown, unknown>;
}

export function getQueueDefinitionInternals(value: unknown): QueueDefinitionInternal {
  if (!value || typeof value !== 'object') {
    throw new Error('Value is not a queue definition.');
  }

  const internals = (value as Record<PropertyKey, unknown>)[kQueueDefinitionInternals];
  if (!internals) {
    throw new Error('Object is not a better-cf durable-object queue handle.');
  }

  return internals as QueueDefinitionInternal;
}

export function getQueueConsumerInternals<E>(value: unknown): QueueConsumerInternal<E> {
  if (!value || typeof value !== 'object') {
    throw new Error('Value is not a queue consumer registration.');
  }

  const internals = (value as Record<PropertyKey, unknown>)[kQueueConsumerInternals];
  if (!internals) {
    throw new Error('Object is not a better-cf durable-object queue consumer registration.');
  }

  return internals as QueueConsumerInternal<E>;
}

export function getWorkerInternals<E>(value: unknown): WorkerInternal<E> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const internals = (value as Record<PropertyKey, unknown>)[kWorkerInternals];
  return internals as WorkerInternal<E> | undefined;
}

export function createQueueProducerApi(
  binding: unknown,
  payload: unknown,
  options?: { delay?: number; contentType?: string }
): Promise<void> {
  const queueBinding = binding as
    | {
        send: (value: unknown, opts?: { delaySeconds?: number; contentType?: string }) => Promise<void>;
      }
    | undefined;

  if (!queueBinding || typeof queueBinding.send !== 'function') {
    throw new Error('Queue binding is not available in env.');
  }

  return queueBinding.send(payload, options);
}

export function createQueueProducerBatchApi(
  binding: unknown,
  payload: Array<{ body: unknown; delaySeconds?: number; contentType?: string }>
): Promise<void> {
  const queueBinding = binding as
    | {
        sendBatch: (entries: Array<{ body: unknown; delaySeconds?: number; contentType?: string }>) => Promise<void>;
      }
    | undefined;

  if (!queueBinding || typeof queueBinding.sendBatch !== 'function') {
    throw new Error('Queue binding is not available in env.');
  }

  return queueBinding.sendBatch(payload);
}

export async function consumeQueueRegistration<E>(
  definitionHandle: unknown,
  consumerRegistration: unknown,
  batch: MessageBatch<unknown>,
  env: E,
  executionCtx: ExecutionContext
): Promise<void> {
  const definition = getQueueDefinitionInternals(definitionHandle);
  const consumer = getQueueConsumerInternals<E>(consumerRegistration);
  const runtime = createRuntimeContext(env, executionCtx);

  if (definition.config.consumer && (definition.config.consumer as PullConsumerConfig).type === 'http_pull') {
    batch.ackAll();
    return;
  }

  if (consumer.type === 'batch') {
    let ackOrRetryHandled = false;
    const batchCtx = {
      ...runtime,
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
      const schema = (definition.config as QueueConfig<z.ZodTypeAny>).args;
      const entries = batch.messages.map((message) => {
        const parsed = schema.safeParse(message.body);
        if (!parsed.success) {
          throw new Error(`Queue batch validation failed for ${message.id}: ${parsed.error.message}`);
        }

        return {
          data: parsed.data,
          id: message.id,
          timestamp: message.timestamp,
          attempts: message.attempts
        };
      });

      await (consumer.config as QueueBatchConsumerConfig<E, unknown>).handler(batchCtx, entries);
      if (!ackOrRetryHandled) {
        batch.ackAll();
      }
    } catch (error) {
      const failure = (consumer.config as QueueBatchConsumerConfig<E, unknown>).failure;
      if (failure) {
        await failure(batchCtx, null, toError(error));
      }
      if (!ackOrRetryHandled) {
        batch.retryAll(withRetryDelay(definition.config.retryDelay));
      }
    }
    return;
  }

  if (consumer.type === 'job-message') {
    const jobConfig = (definition.config as MultiJobQueueConfig<Record<string, unknown>>)[
      consumer.jobName as string
    ] as QueueJobConfig<z.ZodTypeAny>;

    for (const message of batch.messages) {
      const envelope = message.body as { _job?: string; data?: unknown };
      if (envelope?._job !== consumer.jobName) {
        if (!envelope?._job) {
          message.ack();
        }
        continue;
      }

      const messageCtx = {
        ...runtime,
        message: {
          id: message.id,
          timestamp: message.timestamp,
          attempts: message.attempts,
          queue: batch.queue
        }
      };

      try {
        const parsed = jobConfig.args.safeParse(envelope.data);
        if (!parsed.success) {
          throw new Error(`Queue job validation failed for ${consumer.jobName}: ${parsed.error.message}`);
        }

        await (consumer.config as QueueMessageConsumerConfig<E, unknown>).handler(messageCtx, parsed.data);
        message.ack();
      } catch (error) {
        const failure = (consumer.config as QueueMessageConsumerConfig<E, unknown>).failure;
        if (failure) {
          await failure(messageCtx, envelope.data ?? null, toError(error));
        }
        message.retry(withRetryDelay(definition.config.retryDelay));
      }
    }
    return;
  }

  for (const message of batch.messages) {
    const messageCtx = {
      ...runtime,
      message: {
        id: message.id,
        timestamp: message.timestamp,
        attempts: message.attempts,
        queue: batch.queue
      }
    };

    try {
      const schema = (definition.config as QueueConfig<z.ZodTypeAny>).args;
      const parsed = schema.safeParse(message.body);
      if (!parsed.success) {
        throw new Error(`Queue args validation failed: ${parsed.error.message}`);
      }

      await (consumer.config as QueueMessageConsumerConfig<E, unknown>).handler(messageCtx, parsed.data);
      message.ack();
    } catch (error) {
      const failure = (consumer.config as QueueMessageConsumerConfig<E, unknown>).failure;
      if (failure) {
        await failure(messageCtx, message.body as unknown, toError(error));
      }
      message.retry(withRetryDelay(definition.config.retryDelay));
    }
  }
}

export async function invokeDurableFunction<E, TArgs, TReturn>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  args: TArgs
): Promise<TReturn> {
  const internals = getDurableRegistrationInternals(registration) as DurableFunctionInternal<E, unknown, TArgs, TReturn>;
  const parsed = internals.config.args.safeParse(args);
  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  const ctx = makeDurableBaseContext(env, executionCtx, state);
  const result = await internals.config.handler(ctx, parsed.data);
  if (internals.config.returns) {
    return internals.config.returns.parse(result);
  }
  return result;
}

export async function invokeDurableFetch<E>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  request: Request
): Promise<Response> {
  const internals = getDurableRegistrationInternals(registration) as DurableFetchInternal<E>;
  const ctx = makeDurableBaseContext(env, executionCtx, state);
  return internals.config.handler({
    ...ctx,
    request
  });
}

export async function invokeDurableAlarm<E>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  alarmInfo: AlarmInvocationInfo
): Promise<void> {
  const internals = getDurableRegistrationInternals(registration) as DurableAlarmInternal<E>;
  const ctx = makeDurableBaseContext(env, executionCtx, state);
  await internals.config.handler({
    ...ctx,
    alarmInfo
  });
}

export async function invokeDurableInit<E>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown
): Promise<void> {
  const internals = getDurableRegistrationInternals(registration) as DurableInitInternal<E>;
  const ctx = makeDurableBaseContext(env, executionCtx, state);
  await internals.config.handler(ctx);
}

export async function invokeDurableWebSocketConnect<E, TAttachment>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  request: Request
): Promise<Response> {
  const internals = getDurableRegistrationInternals(registration) as DurableWebSocketInternal<E, TAttachment>;
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];
  let accepted = false;

  const ctx = makeDurableBaseContext(env, executionCtx, state);
  const response = await internals.config.connect?.({
    ...ctx,
    request,
    client,
    server,
    accept(options) {
      accepted = true;
      state.acceptWebSocket(server, options?.tags);
      if (options?.attachment !== undefined) {
        const attachment = internals.config.serializeAttachment
          ? internals.config.serializeAttachment(options.attachment)
          : options.attachment;
        server.serializeAttachment(attachment);
      }
    }
  });

  if (response) {
    return response;
  }

  if (!accepted) {
    state.acceptWebSocket(server);
  }

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

export async function invokeDurableWebSocketMessage<E, TAttachment>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  socket: WebSocket,
  message: string | ArrayBuffer
): Promise<void> {
  const internals = getDurableRegistrationInternals(registration) as DurableWebSocketInternal<E, TAttachment>;
  if (!internals.config.message) {
    return;
  }

  const ctx = makeDurableBaseContext(env, executionCtx, state);
  await internals.config.message({
    ...ctx,
    socket,
    attachment: hydrateAttachment(socket, internals)
  }, message);
}

export async function invokeDurableWebSocketClose<E, TAttachment>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  socket: WebSocket,
  code: number,
  reason: string,
  wasClean: boolean
): Promise<void> {
  const internals = getDurableRegistrationInternals(registration) as DurableWebSocketInternal<E, TAttachment>;
  if (!internals.config.close) {
    return;
  }

  const ctx = makeDurableBaseContext(env, executionCtx, state);
  await internals.config.close({
    ...ctx,
    socket,
    attachment: hydrateAttachment(socket, internals)
  }, code, reason, wasClean);
}

export async function invokeDurableWebSocketError<E, TAttachment>(
  env: E,
  state: DurableObjectState,
  executionCtx: ExecutionContext,
  registration: unknown,
  socket: WebSocket,
  error: unknown
): Promise<void> {
  const internals = getDurableRegistrationInternals(registration) as DurableWebSocketInternal<E, TAttachment>;
  if (!internals.config.error) {
    return;
  }

  const ctx = makeDurableBaseContext(env, executionCtx, state);
  await internals.config.error({
    ...ctx,
    socket,
    attachment: hydrateAttachment(socket, internals)
  }, error);
}

function hydrateAttachment<E, TAttachment>(
  socket: WebSocket,
  internals: DurableWebSocketInternal<E, TAttachment>
): TAttachment | undefined {
  const value = socket.deserializeAttachment();
  if (value === undefined) {
    return undefined;
  }
  return internals.config.hydrateAttachment ? internals.config.hydrateAttachment(value) : (value as TAttachment);
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function withRetryDelay(value: unknown): { delaySeconds?: number } | undefined {
  if (value === undefined) {
    return undefined;
  }

  return { delaySeconds: parseDurationSeconds(value as never) };
}

export function createGeneratedQueueApi(binding: unknown, payload: unknown, options?: { delay?: unknown; contentType?: unknown }) {
  return createQueueProducerApi(binding, payload, toCloudflareSendOptions(options as never));
}

export function createGeneratedQueueBatchApi(
  binding: unknown,
  messages: Array<{ data: unknown; delay?: unknown; contentType?: unknown }>
) {
  return createQueueProducerBatchApi(
    binding,
    messages.map((message) => ({
      body: message.data,
      ...toCloudflareSendOptions(message as never)
    }))
  );
}

export function resolveWorkerHandlers(moduleLike: {
  default?: unknown;
  fetch?: (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>;
  scheduled?: (event: ScheduledEvent, env: unknown, ctx: ExecutionContext) => Promise<void>;
}) {
  const root = moduleLike.default ?? moduleLike;
  const worker = getWorkerInternals(root);
  if (worker) {
    return {
      async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
        return worker.config.fetch(request, createRuntimeContext(env, ctx));
      },
      ...(worker.config.scheduled
        ? {
            async scheduled(event: ScheduledEvent, env: unknown, ctx: ExecutionContext): Promise<void> {
              await worker.config.scheduled?.(event, createRuntimeContext(env, ctx));
            }
          }
        : {})
    };
  }

  let fetchHandler: ((request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>) | undefined;
  if (root && typeof root === 'object' && 'fetch' in root) {
    const maybeFetch = (root as { fetch?: unknown }).fetch;
    if (typeof maybeFetch === 'function') {
      fetchHandler = maybeFetch.bind(root) as (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>;
    }
  }

  if (!fetchHandler && typeof moduleLike.fetch === 'function') {
    fetchHandler = moduleLike.fetch;
  }

  if (!fetchHandler) {
    throw new Error('Could not resolve worker fetch handler.');
  }

  let scheduledHandler: ((event: ScheduledEvent, env: unknown, ctx: ExecutionContext) => Promise<void>) | undefined;
  if (root && typeof root === 'object' && 'scheduled' in root) {
    const maybeScheduled = (root as { scheduled?: unknown }).scheduled;
    if (typeof maybeScheduled === 'function') {
      scheduledHandler = maybeScheduled.bind(root) as (
        event: ScheduledEvent,
        env: unknown,
        ctx: ExecutionContext
      ) => Promise<void>;
    }
  }

  if (!scheduledHandler && typeof moduleLike.scheduled === 'function') {
    scheduledHandler = moduleLike.scheduled;
  }

  return {
    fetch: fetchHandler,
    scheduled: scheduledHandler
  };
}
