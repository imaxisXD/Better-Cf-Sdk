import { createSDK } from 'better-cf/queue';

export const { defineQueue, defineWorker } = createSDK();
