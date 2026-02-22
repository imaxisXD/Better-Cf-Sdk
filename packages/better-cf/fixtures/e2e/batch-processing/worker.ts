import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response('batch');
  }
});
