import { defineQueueFactory } from './define-queue.js';
import { defineWorkerFactory } from './define-worker.js';
import type { BetterCfAutoEnv, BetterCfSDK } from './types.js';

/**
 * Creates typed queue + worker helpers for your Cloudflare Worker app.
 *
 * @example
 * const { defineQueue, defineWorker } = createSDK<Env>();
 */
export function createSDK<E extends Record<string, unknown> = BetterCfAutoEnv>(): BetterCfSDK<E> {
  return {
    defineQueue: defineQueueFactory<E>(),
    defineWorker: defineWorkerFactory<E>()
  };
}
