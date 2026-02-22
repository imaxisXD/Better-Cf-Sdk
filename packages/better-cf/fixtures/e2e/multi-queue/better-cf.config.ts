import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_EMAIL: Queue;
  QUEUE_AUDIT: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
