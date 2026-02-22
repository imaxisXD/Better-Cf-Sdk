import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_SIGNUP: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
