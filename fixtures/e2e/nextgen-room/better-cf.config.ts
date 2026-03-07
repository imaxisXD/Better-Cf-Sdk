import { createSDK } from 'better-cf/durable-object';

export const sdk = createSDK();
export const defineWorker = sdk.defineWorker;

export const betterCfConfig = {
  workerEntry: 'worker.ts'
};
