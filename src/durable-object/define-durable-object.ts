import { kDurableObjectInternals, kDurableRegistrationInternals, normalizeKey } from './internal.js';
import type {
  DefineDurableObject,
  DurableAlarmConfig,
  DurableFetchConfig,
  DurableFnConfig,
  DurableObjectConfig,
  DurableObjectHandle,
  DurableWebSocketConfig
} from './types.js';
import type { z } from 'zod';

export function defineDurableObjectFactory<E>(): DefineDurableObject<E> {
  return function defineDurableObject<TKeySchema extends z.ZodTypeAny>(
    config: DurableObjectConfig<TKeySchema>
  ): DurableObjectHandle<E, z.infer<TKeySchema>> {
    const handle: Record<string | symbol, unknown> = {
      fn(fnConfig: DurableFnConfig<E, z.ZodTypeAny, unknown>) {
        return createTypedFunctionRegistration<E>('public', fnConfig);
      },
      internal(fnConfig: DurableFnConfig<E, z.ZodTypeAny, unknown>) {
        return createTypedFunctionRegistration<E>('internal', fnConfig);
      },
      fetch(fetchConfig: DurableFetchConfig<E>) {
        return createRegistration({ kind: 'fetch', config: fetchConfig });
      },
      alarm(alarmConfig: DurableAlarmConfig<E>) {
        return createRegistration({ kind: 'alarm', config: alarmConfig });
      },
      init(initConfig: { description?: string; handler: DurableFnConfig<E, z.ZodTypeAny, void>['handler'] }) {
        return createRegistration({ kind: 'init', config: initConfig });
      },
      websocket(websocketConfig: DurableWebSocketConfig<E, unknown>) {
        return createRegistration({ kind: 'websocket', config: websocketConfig });
      }
    };

    Object.defineProperty(handle, kDurableObjectInternals, {
      enumerable: false,
      configurable: false,
      writable: false,
      value: {
        config,
        keySchema: config.key,
        serializeKey(value: unknown) {
          const parsed = config.key.safeParse(value);
          if (!parsed.success) {
            throw new Error(`Invalid durable object key for ${config.name}: ${parsed.error.message}`);
          }
          return normalizeKey(parsed.data);
        }
      }
    });

    return handle as unknown as DurableObjectHandle<E, z.infer<TKeySchema>>;
  };
}

function createFunctionRegistration(
  visibility: 'public' | 'internal',
  config: DurableFnConfig<unknown, z.ZodTypeAny, unknown>
) {
  return createRegistration({
    kind: 'function',
    visibility,
    config
  });
}

function createTypedFunctionRegistration<E>(
  visibility: 'public' | 'internal',
  config: DurableFnConfig<E, z.ZodTypeAny, unknown>
) {
  return createFunctionRegistration(visibility, config as DurableFnConfig<unknown, z.ZodTypeAny, unknown>);
}

function createRegistration(value: unknown) {
  const registration: Record<string | symbol, unknown> = {};
  Object.defineProperty(registration, kDurableRegistrationInternals, {
    enumerable: false,
    configurable: false,
    writable: false,
    value:
      value && typeof value === 'object' && 'kind' in (value as Record<string, unknown>)
        ? mapRegistration(value as Record<string, unknown>)
        : value
  });
  return registration;
}

function mapRegistration(value: Record<string, unknown>) {
  if (value.kind === 'function') {
    return {
      visibility: value.visibility,
      config: value.config
    };
  }

  return {
    config: value.config
  };
}
