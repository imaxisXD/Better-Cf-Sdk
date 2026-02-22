import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_JSONC: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
