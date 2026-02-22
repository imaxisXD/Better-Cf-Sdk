import { defineQueueFactory } from './define-queue.js';
import { defineWorkerFactory } from './define-worker.js';
import type { BetterCfAutoEnv } from './types.js';

export function createSDK<E extends Record<string, unknown> = BetterCfAutoEnv>() {
  return {
    defineQueue: defineQueueFactory<E>(),
    defineWorker: defineWorkerFactory<E>()
  };
}
