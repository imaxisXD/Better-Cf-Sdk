import type { QueueDefinition } from './types.js';

export const kQueueInternals = Symbol.for('better-cf.queue.internals');

export interface QueueInternalApi<E> {
  setBinding(name: string): void;
  getBinding(): string | null;
  getDefinition(): QueueDefinition<E>;
  consume(batch: MessageBatch<unknown>, env: E, executionCtx: ExecutionContext): Promise<void>;
}

export type QueueWithInternals<E> = {
  [kQueueInternals]: QueueInternalApi<E>;
};

export function getQueueInternals<E>(value: unknown): QueueInternalApi<E> {
  if (!value || typeof value !== 'object') {
    throw new Error('Queue handle is not an object.');
  }

  const internals = (value as QueueWithInternals<E>)[kQueueInternals];
  if (!internals) {
    throw new Error('Object is not a better-cf queue handle.');
  }

  return internals;
}

export interface WorkerModuleLike {
  default?: unknown;
  fetch?: (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>;
  scheduled?: (
    event: ScheduledEvent,
    env: unknown,
    ctx: ExecutionContext
  ) => Promise<void>;
}

export interface ResolvedWorkerHandlers {
  fetch: (request: Request, env: unknown, ctx: ExecutionContext) => Promise<Response>;
  scheduled?: (event: ScheduledEvent, env: unknown, ctx: ExecutionContext) => Promise<void>;
}

export function resolveWorkerHandlers(moduleLike: WorkerModuleLike): ResolvedWorkerHandlers {
  const root = moduleLike.default ?? moduleLike;

  let fetchHandler: ResolvedWorkerHandlers['fetch'] | undefined;
  if (typeof root === 'function') {
    fetchHandler = root as ResolvedWorkerHandlers['fetch'];
  } else if (root && typeof root === 'object' && 'fetch' in root) {
    const maybeFetch = (root as { fetch?: unknown }).fetch;
    if (typeof maybeFetch === 'function') {
      fetchHandler = maybeFetch.bind(root) as ResolvedWorkerHandlers['fetch'];
    }
  }

  if (!fetchHandler && typeof moduleLike.fetch === 'function') {
    fetchHandler = moduleLike.fetch;
  }

  if (!fetchHandler) {
    throw new Error(
      'Could not resolve worker fetch handler. Export default app/object/function or named fetch.'
    );
  }

  let scheduledHandler: ResolvedWorkerHandlers['scheduled'] | undefined;
  if (root && typeof root === 'object' && 'scheduled' in root) {
    const maybeScheduled = (root as { scheduled?: unknown }).scheduled;
    if (typeof maybeScheduled === 'function') {
      scheduledHandler = maybeScheduled.bind(root) as ResolvedWorkerHandlers['scheduled'];
    }
  }

  if (!scheduledHandler && typeof moduleLike.scheduled === 'function') {
    scheduledHandler = moduleLike.scheduled;
  }

  return {
    fetch: fetchHandler,
    scheduled: scheduledHandler
  };
}
