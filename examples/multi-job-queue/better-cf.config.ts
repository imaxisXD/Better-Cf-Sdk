import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_JOBS: Queue;
};

export const { defineQueue, defineQueues, defineWorker } = createSDK<Env>();
