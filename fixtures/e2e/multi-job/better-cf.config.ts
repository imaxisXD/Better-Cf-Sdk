import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_JOBS: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
