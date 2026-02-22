import { createSDK } from 'better-cf/queue';

export type Env = {
  QUEUE_LEGACY: Queue;
};

export const { defineQueue } = createSDK<Env>();

export const betterCfConfig = {
  legacyServiceWorker: true
};
