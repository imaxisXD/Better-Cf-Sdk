import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_AUDIT: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
