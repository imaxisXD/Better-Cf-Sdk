import { getQueueInternals } from '../queue/internal.js';

export interface TestQueueOptions<E, TMessage> {
  env: E;
  message?: TMessage;
  messages?: TMessage[];
  attempts?: number;
}

export interface TestQueueResult<TMessage> {
  acked: TMessage[];
  retried: TMessage[];
}

export async function testQueue<E, TMessage>(
  handle: unknown,
  options: TestQueueOptions<E, TMessage>
): Promise<TestQueueResult<TMessage>> {
  const internals = getQueueInternals<E>(handle);

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
