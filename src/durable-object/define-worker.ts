import { createRuntimeContext, kWorkerInternals } from './internal.js';
import type { DefineWorker, WorkerConfig, WorkerEntrypoint } from './types.js';

export function defineWorkerFactory<E>(): DefineWorker<E> {
  return function defineWorker(config: WorkerConfig<E>): WorkerEntrypoint<E> {
    const entrypoint: Record<string | symbol, unknown> = {
      async fetch(request: Request, env: E, executionCtx: ExecutionContext): Promise<Response> {
        return config.fetch(request, createRuntimeContext(env, executionCtx));
      },
      ...(config.scheduled
        ? {
            async scheduled(event: ScheduledEvent, env: E, executionCtx: ExecutionContext): Promise<void> {
              await config.scheduled?.(event, createRuntimeContext(env, executionCtx));
            }
          }
        : {})
    };

    Object.defineProperty(entrypoint, kWorkerInternals, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: { config }
    });

    return entrypoint as unknown as WorkerEntrypoint<E>;
  };
}
