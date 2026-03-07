import { kQueueConsumerInternals, kQueueDefinitionInternals } from './internal.js';
import type {
  DefineQueue,
  DefineQueues,
  ExtractQueueJobs,
  MultiJobQueueConfig,
  MultiJobQueueHandle,
  QueueConfig,
  QueueHandle,
  QueueJobConfig,
  QueueJobHandle
} from './types.js';
import type { z } from 'zod';

const RESERVED_MULTI_JOB_KEYS = new Set([
  'retry',
  'retryDelay',
  'deadLetter',
  'deliveryDelay',
  'visibilityTimeout',
  'batch',
  'consumer',
  'args',
  'description'
]);

export function defineQueueFactory<E>(): DefineQueue<E> {
  return function defineQueue<TSchema extends z.ZodTypeAny>(
    config: QueueConfig<TSchema>
  ): QueueHandle<E, z.infer<TSchema>> {
    assertNoInlineHandlers(config as unknown as Record<string, unknown>);

    let bindingName: string | null = null;
    const handle: Record<string | symbol, unknown> = {
      message(consumerConfig: unknown) {
        return createConsumerRegistration('message', handle, consumerConfig);
      },
      batch(consumerConfig: unknown) {
        return createConsumerRegistration('batch', handle, consumerConfig);
      }
    };

    Object.defineProperty(handle, kQueueDefinitionInternals, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: {
        kind: 'single',
        config,
        bindingName,
        setBinding(name: string) {
          bindingName = name;
        },
        getBinding() {
          return bindingName;
        }
      }
    });

    return handle as unknown as QueueHandle<E, z.infer<TSchema>>;
  };
}

export function defineQueuesFactory<E>(): DefineQueues<E> {
  return function defineQueues<const TConfig extends Record<string, unknown>>(
    config: MultiJobQueueConfig<TConfig>
  ): MultiJobQueueHandle<E, ExtractQueueJobs<TConfig>> {
    const jobs = Object.entries(config).filter(([key, value]) => {
      if (RESERVED_MULTI_JOB_KEYS.has(key)) {
        return false;
      }
      return isQueueJobConfig(value);
    });

    if (jobs.length === 0) {
      throw new Error('Multi-job queue config must define at least one job.');
    }

    let bindingName: string | null = null;
    const parent: Record<string | symbol, unknown> = {};
    Object.defineProperty(parent, kQueueDefinitionInternals, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: {
        kind: 'multi',
        config,
        bindingName,
        setBinding(name: string) {
          bindingName = name;
        },
        getBinding() {
          return bindingName;
        }
      }
    });

    for (const [jobName] of jobs) {
      parent[jobName] = createJobHandle(parent, jobName);
    }

    return parent as MultiJobQueueHandle<E, ExtractQueueJobs<TConfig>>;
  };
}

function createJobHandle(parent: object, jobName: string): QueueJobHandle<unknown, unknown> {
  return {
    message(consumerConfig: unknown) {
      return createConsumerRegistration('job-message', parent, consumerConfig, jobName);
    }
  };
}

function createConsumerRegistration(type: 'message' | 'batch' | 'job-message', queue: object, config: unknown, jobName?: string) {
  const registration: Record<string | symbol, unknown> = {};
  Object.defineProperty(registration, kQueueConsumerInternals, {
    enumerable: false,
    configurable: false,
    writable: false,
    value: {
      type,
      queue,
      jobName,
      config
    }
  });
  return registration;
}

function isQueueJobConfig(value: unknown): value is QueueJobConfig<z.ZodTypeAny> {
  return typeof value === 'object' && value !== null && 'args' in value;
}

function assertNoInlineHandlers(config: Record<string, unknown>) {
  if ('handler' in config || 'batchHandler' in config || 'onFailure' in config) {
    throw new Error(
      'Inline queue handlers are not supported in better-cf/durable-object. Use queue.message(...) or queue.batch(...).'
    );
  }
}
