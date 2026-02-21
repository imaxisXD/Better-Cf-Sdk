import type { QueueEnv, WorkerConfig } from './types.js';

export function defineWorkerFactory<E>() {
  return function defineWorker(config: WorkerConfig<E>) {
    return {
      async fetch(request: Request, env: E, executionCtx: ExecutionContext): Promise<Response> {
        return config.fetch(request, {
          env: env as QueueEnv<E>,
          executionCtx
        });
      },
      ...(config.scheduled
        ? {
            async scheduled(event: ScheduledEvent, env: E, executionCtx: ExecutionContext): Promise<void> {
              await config.scheduled?.(event, {
                env: env as QueueEnv<E>,
                executionCtx
              });
            }
          }
        : {})
    };
  };
}
