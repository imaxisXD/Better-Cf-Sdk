import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_EMAIL: Queue;
};

export const { defineQueue } = createSDK<Env>();
