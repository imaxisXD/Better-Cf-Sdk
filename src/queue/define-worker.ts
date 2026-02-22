import type { DefineWorker, QueueEnv, WorkerConfig, WorkerEntrypoint } from './types.js';

/**
 * Creates a typed `defineWorker` helper bound to the SDK env generic.
 */
export function defineWorkerFactory<E>(): DefineWorker<E> {
  return function defineWorker(config: WorkerConfig<E>): WorkerEntrypoint<E> {
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
