import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_SIGNUP: Queue;
};

export const { defineQueue, defineWorker } = createSDK<Env>();
