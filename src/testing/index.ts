import { getQueueInternals } from '../queue/internal.js';

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
