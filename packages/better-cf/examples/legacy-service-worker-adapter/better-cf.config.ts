import { createSDK } from 'better-cf/queue';

type Env = {
  QUEUE_LEGACY: Queue;
};

export const { defineQueue } = createSDK<Env>();

export const betterCfConfig = {
  legacyServiceWorker: true
};
