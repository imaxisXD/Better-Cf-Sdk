import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_EMAIL: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
