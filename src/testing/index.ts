import { getQueueInternals } from '../queue/internal.js';
import { consumeQueueRegistration, invokeDurableFunction, setGeneratedApiFactory } from '../durable-object/internal.js';
import type { DurableFnArgs, DurableFnReturn } from '../durable-object/index.js';

/**
 * Options for queue consumer tests.
 */
interface TestQueueBaseOptions<E> {
  /** Worker env object passed into queue consume simulation. */
  env: E;
  /** Overrides message attempts metadata. */
  attempts?: number;
}

/**
 * Options for queue consumer tests.
 */
export type TestQueueOptions<E, TMessage> =
  | (TestQueueBaseOptions<E> & {
      /** Test one message. */
      message: TMessage;
      messages?: never;
    })
  | (TestQueueBaseOptions<E> & {
      /** Test many messages in one batch. */
      messages: TMessage[];
      message?: never;
    });

/**
 * Test execution result for queue consumers.
 */
export interface TestQueueResult<TMessage> {
  /** Messages acked by the consumer. */
  acked: TMessage[];
  /** Messages retried by the consumer. */
  retried: TMessage[];
}

export type TestQueueConsumerOptions<E, TMessage> = TestQueueOptions<E, TMessage> & {
  /** Optional generated API object to inject into `ctx.api` for tests. */
  api?: Record<string, unknown>;
};

export interface TestDurableFunctionOptions<E, TArgs> {
  env: E;
  args: TArgs;
  storage?: Map<string, unknown>;
  api?: Record<string, unknown>;
}

/**
 * Runs a queue declaration's consumer logic in-memory for tests.
 *
 * @param handle Queue handle returned by `defineQueue(...)` or `defineQueues(...)`.
 * @param options Test input payloads and env.
 * @returns Acked/retried payload collections captured from the simulated consume flow.
 */
export async function testQueue<E, TMessage>(
  handle: unknown,
  options: TestQueueOptions<E, TMessage>
): Promise<TestQueueResult<TMessage>> {
  const internals = getQueueInternals<E>(handle);

  if ('message' in options && 'messages' in options) {
    throw new Error('testQueue accepts either message or messages, not both.');
  }

  const allMessages = options.messages ?? (options.message !== undefined ? [options.message] : []);
  if (allMessages.length === 0) {
    throw new Error('testQueue requires message or messages.');
  }

  const result: TestQueueResult<TMessage> = {
    acked: [],
    retried: []
  };

  const batch: MessageBatch<unknown> = {
    queue: 'test-queue',
    messages: allMessages.map((body, index) => ({
      id: `msg-${index}`,
      timestamp: new Date(),
      body,
      attempts: options.attempts ?? 1,
      ack: () => {
        result.acked.push(body);
      },
      retry: () => {
        result.retried.push(body);
      }
    })),
    ackAll: () => {
      result.acked.push(...allMessages);
    },
    retryAll: () => {
      result.retried.push(...allMessages);
    }
  };

  const executionCtx = {
    waitUntil() {
      return;
    },
    passThroughOnException() {
      return;
    },
    props: {}
  } as unknown as ExecutionContext;

  await internals.consume(batch, options.env, executionCtx);

  return result;
}

export async function testQueueConsumer<E, TMessage>(
  queue: unknown,
  consumer: unknown,
  options: TestQueueConsumerOptions<E, TMessage>
): Promise<TestQueueResult<TMessage>> {
  if (options.api) {
    setGeneratedApiFactory(() => options.api as never);
  }

  const result = createQueueBatch<E, TMessage>(options);
  const executionCtx = createExecutionContext();
  await consumeQueueRegistration(queue, consumer, result.batch, options.env, executionCtx);
  return result.result;
}

export async function testDurableFunction<E, TFunction>(
  fn: TFunction,
  options: TestDurableFunctionOptions<E, DurableFnArgs<TFunction>>
): Promise<DurableFnReturn<TFunction>> {
  if (options.api) {
    setGeneratedApiFactory(() => options.api as never);
  }

  const state = createDurableState(options.storage);
  const executionCtx = createExecutionContext();
  return invokeDurableFunction(options.env, state, executionCtx, fn, options.args as never) as Promise<
    DurableFnReturn<TFunction>
  >;
}

function createQueueBatch<E, TMessage>(options: TestQueueOptions<E, TMessage>) {
  if ('message' in options && 'messages' in options) {
    throw new Error('testQueueConsumer accepts either message or messages, not both.');
  }

  const allMessages = options.messages ?? (options.message !== undefined ? [options.message] : []);
  if (allMessages.length === 0) {
    throw new Error('testQueueConsumer requires message or messages.');
  }

  const result: TestQueueResult<TMessage> = {
    acked: [],
    retried: []
  };

  return {
    result,
    batch: {
      queue: 'test-queue',
      messages: allMessages.map((body, index) => ({
        id: `msg-${index}`,
        timestamp: new Date(),
        body,
        attempts: options.attempts ?? 1,
        ack: () => {
          result.acked.push(body);
        },
        retry: () => {
          result.retried.push(body);
        }
      })),
      ackAll: () => {
        result.acked.push(...allMessages);
      },
      retryAll: () => {
        result.retried.push(...allMessages);
      }
    } as MessageBatch<unknown>
  };
}

function createExecutionContext(): ExecutionContext {
  return {
    waitUntil() {
      return;
    },
    passThroughOnException() {
      return;
    },
    props: {}
  } as unknown as ExecutionContext;
}

function createDurableState(storageMap = new Map<string, unknown>()): DurableObjectState {
  const storage = {
    sql: {
      exec() {
        return {
          one() {
            return undefined;
          },
          toArray() {
            return [];
          },
          raw() {
            return [];
          }
        };
      }
    },
    async get(key: string) {
      return storageMap.get(key);
    },
    async put(key: string, value: unknown) {
      storageMap.set(key, value);
    },
    async delete(key: string) {
      return storageMap.delete(key);
    },
    async deleteAll() {
      storageMap.clear();
    },
    async list() {
      return new Map(storageMap);
    },
    async getAlarm() {
      return null;
    },
    async setAlarm() {
      return;
    },
    async deleteAlarm() {
      return;
    }
  } as unknown as DurableObjectStorage;

  return {
    storage,
    blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T> {
      return callback();
    },
    waitUntil() {
      return;
    },
    acceptWebSocket() {
      return;
    },
    getWebSockets() {
      return [];
    }
  } as unknown as DurableObjectState;
}
