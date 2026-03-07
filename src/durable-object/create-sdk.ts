import { defineDurableObjectFactory } from './define-durable-object.js';
import { defineQueueFactory, defineQueuesFactory } from './define-queue.js';
import { defineWorkerFactory } from './define-worker.js';
import type { BetterCfAutoEnv, BetterCfSDK } from './types.js';

export function createSDK<E extends Record<string, unknown> = BetterCfAutoEnv>(): BetterCfSDK<E> {
  return {
    defineDurableObject: defineDurableObjectFactory<E>(),
    defineQueue: defineQueueFactory<E>(),
    defineQueues: defineQueuesFactory<E>(),
    defineWorker: defineWorkerFactory<E>()
  };
}
