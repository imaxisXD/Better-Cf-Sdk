import type { RegistryManifest } from './types.js';

export const DEFAULT_REGISTRY: RegistryManifest = {
  items: [
    {
      id: 'queue/basic',
      description: 'Add a basic queue declaration under src/queues/signup.ts.',
      files: [
        {
          path: 'src/queues/signup.ts',
          content: `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  args: z.object({ email: z.string().email() }),
  handler: async () => {}
});
`
        }
      ],
      dependencies: ['zod']
    },
    {
      id: 'worker/http-health',
      description: 'Add a fetch health endpoint for module worker projects.',
      files: [
        {
          path: 'worker.ts',
          content: `import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' }
    });
  }
});
`
        }
      ]
    }
  ]
};
