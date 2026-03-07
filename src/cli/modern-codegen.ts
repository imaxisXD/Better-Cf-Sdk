import fs from 'node:fs';
import path from 'node:path';
import type { CliConfig } from './types.js';
import type {
  ModernDiscoveredDurableObject,
  ModernDiscoveredDurableRegistration,
  ModernDiscoveredQueue,
  ModernDiscoveredQueueConsumer,
  ModernDiscoveryResult
} from './modern-types.js';

export interface ModernCodegenResult {
  entryPath: string;
  typesPath: string;
}

export function generateModernCode(discovery: ModernDiscoveryResult, config: CliConfig): ModernCodegenResult {
  const outputDir = path.join(config.rootDir, '.better-cf');
  fs.mkdirSync(outputDir, { recursive: true });

  const workerEntryAbsolute = resolveWorkerEntry(config);
  const entryPath = path.join(outputDir, 'entry.ts');
  const typesPath = path.join(outputDir, 'types.d.ts');

  fs.writeFileSync(entryPath, renderEntryFile(discovery, workerEntryAbsolute, outputDir), 'utf8');
  fs.writeFileSync(typesPath, renderTypesFile(discovery, outputDir), 'utf8');

  return {
    entryPath,
    typesPath
  };
}

function resolveWorkerEntry(config: CliConfig): string {
  if (config.workerEntry) {
    return path.resolve(config.rootDir, config.workerEntry);
  }

  const candidates = ['worker.ts', 'src/worker.ts', 'src/index.ts'].map((candidate) =>
    path.resolve(config.rootDir, candidate)
  );

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error('Could not resolve worker entry for better-cf durable-object generation.');
  }
  return found;
}

function renderEntryFile(
  discovery: ModernDiscoveryResult,
  workerEntryAbsolute: string,
  outDir: string
): string {
  const imports: string[] = [];
  const bindingSetup: string[] = [];
  const queueConsumerMapLines: string[] = [];
  const queueApiLines: string[] = [];
  const durableApiLines: string[] = [];
  const internalApiLines: string[] = [];
  const durableClassLines: string[] = [];
  const queueAliasMap = new Map<string, string>();
  const durableAliasMap = new Map<string, string>();
  const registrationAliasMap = new Map<string, string>();

  imports.push(`import workerDefault, * as workerModule from ${JSON.stringify(toImportPath(outDir, workerEntryAbsolute))};`);
  imports.push(
    `import { createGeneratedQueueApi, createGeneratedQueueBatchApi, consumeQueueRegistration, getDurableObjectInternals, getQueueDefinitionInternals, invokeDurableAlarm, invokeDurableFetch, invokeDurableFunction, invokeDurableInit, invokeDurableWebSocketClose, invokeDurableWebSocketConnect, invokeDurableWebSocketError, invokeDurableWebSocketMessage, resolveWorkerHandlers, setGeneratedApiFactory } from 'better-cf/durable-object/internal';`
  );

  discovery.queues.forEach((queue, index) => {
    const alias = `__queue_${index}`;
    queueAliasMap.set(queue.id, alias);
    imports.push(`import { ${queue.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, queue.absoluteFilePath))};`);
    bindingSetup.push(`getQueueDefinitionInternals(${alias}).setBinding('${queue.bindingName}');`);
  });

  discovery.durableObjects.forEach((durableObject, index) => {
    const alias = `__durable_${index}`;
    durableAliasMap.set(durableObject.id, alias);
    imports.push(
      `import { ${durableObject.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, durableObject.absoluteFilePath))};`
    );
  });

  discovery.queueConsumers.forEach((consumer, index) => {
    const alias = `__queue_consumer_${index}`;
    registrationAliasMap.set(consumer.id, alias);
    imports.push(
      `import { ${consumer.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, consumer.absoluteFilePath))};`
    );
  });

  discovery.durableRegistrations.forEach((registration, index) => {
    const alias = `__durable_registration_${index}`;
    registrationAliasMap.set(registration.id, alias);
    imports.push(
      `import { ${registration.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, registration.absoluteFilePath))};`
    );
  });

  for (const queue of discovery.queues) {
    const consumer = discovery.queueConsumers.find(
      (candidate) => candidate.ownerId === queue.id && candidate.kind !== 'job-message'
    );

    const jobConsumers = discovery.queueConsumers.filter(
      (candidate) => candidate.ownerId === queue.id && candidate.kind === 'job-message'
    );

    const queueAlias = queueAliasMap.get(queue.id)!;
    if (consumer) {
      queueConsumerMapLines.push(`  '${queue.queueName}': { queue: ${queueAlias}, consumer: ${registrationAliasMap.get(consumer.id)} }`);
    } else if (jobConsumers.length > 0) {
      const consumerMap = jobConsumers
        .map((jobConsumer) => `'${jobConsumer.jobName}': ${registrationAliasMap.get(jobConsumer.id)}`)
        .join(', ');
      queueConsumerMapLines.push(`  '${queue.queueName}': { queue: ${queueAlias}, consumers: { ${consumerMap} } }`);
    }

    if (queue.kind === 'single') {
      queueApiLines.push(renderSingleQueueApi(queue));
    } else {
      queueApiLines.push(renderMultiQueueApi(queue));
    }
  }

  for (const durableObject of discovery.durableObjects) {
    const registrations = discovery.durableRegistrations.filter((candidate) => candidate.ownerId === durableObject.id);
    const publicMethods = registrations.filter((candidate) => candidate.kind === 'fn');
    const internalMethods = registrations.filter((candidate) => candidate.kind === 'internal');
    const fetchRegistration = registrations.find((candidate) => candidate.kind === 'fetch');
    const alarmRegistration = registrations.find((candidate) => candidate.kind === 'alarm');
    const initRegistration = registrations.find((candidate) => candidate.kind === 'init');
    const websocketRegistration = registrations.find((candidate) => candidate.kind === 'websocket');

    durableApiLines.push(renderDurableApi(durableObject, publicMethods, durableAliasMap.get(durableObject.id)!));

    if (internalMethods.length > 0) {
      internalApiLines.push(renderInternalDurableApi(durableObject, internalMethods, durableAliasMap.get(durableObject.id)!));
    }

    durableClassLines.push(
      renderDurableClass(
        durableObject,
        durableAliasMap.get(durableObject.id)!,
        publicMethods,
        internalMethods,
        fetchRegistration ? registrationAliasMap.get(fetchRegistration.id)! : undefined,
        alarmRegistration ? registrationAliasMap.get(alarmRegistration.id)! : undefined,
        initRegistration ? registrationAliasMap.get(initRegistration.id)! : undefined,
        websocketRegistration ? registrationAliasMap.get(websocketRegistration.id)! : undefined,
        registrationAliasMap
      )
    );
  }

  const internalBlock =
    internalApiLines.length > 0
      ? `,\n  $internal: {\n${internalApiLines.join(',\n')}\n  }`
      : '';

  return `// Auto-generated by better-cf. Do not edit.
${imports.join('\n')}

${bindingSetup.join('\n')}

setGeneratedApiFactory((env, executionCtx) => ({
${queueApiLines.join(',\n')}
${queueApiLines.length > 0 && durableApiLines.length > 0 ? ',' : ''}${durableApiLines.join(',\n')}
${internalBlock}
}));

const __queueConsumers = {
${queueConsumerMapLines.join(',\n')}
};

const __workerHandlers = resolveWorkerHandlers({ default: workerDefault, ...workerModule });

export default {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    return __workerHandlers.fetch(request, env, ctx);
  },

  async queue(batch: MessageBatch<unknown>, env: unknown, ctx: ExecutionContext): Promise<void> {
    const consumer = __queueConsumers[batch.queue as keyof typeof __queueConsumers];
    if (!consumer) {
      batch.ackAll();
      return;
    }

    if ('consumer' in consumer) {
      await consumeQueueRegistration(consumer.queue, consumer.consumer, batch, env, ctx);
      return;
    }

    for (const message of batch.messages) {
      const envelope = message.body as { _job?: string };
      const jobConsumer = envelope?._job ? consumer.consumers[envelope._job as keyof typeof consumer.consumers] : undefined;
      if (!jobConsumer) {
        message.ack();
        continue;
      }

      await consumeQueueRegistration(consumer.queue, jobConsumer, {
        ...batch,
        messages: [message]
      }, env, ctx);
    }
  },

  ...(__workerHandlers.scheduled
    ? {
        async scheduled(event: ScheduledEvent, env: unknown, ctx: ExecutionContext): Promise<void> {
          await __workerHandlers.scheduled?.(event, env, ctx);
        }
      }
    : {})
};

${durableClassLines.join('\n\n')}
`;
}

function renderSingleQueueApi(queue: ModernDiscoveredQueue): string {
  return `  ${queue.exportName}: {
    async send(args, options) {
      return createGeneratedQueueApi((env as Record<string, unknown>)['${queue.bindingName}'], args, options);
    },
    async sendBatch(messages) {
      return createGeneratedQueueBatchApi((env as Record<string, unknown>)['${queue.bindingName}'], messages);
    }
  }`;
}

function renderMultiQueueApi(queue: ModernDiscoveredQueue): string {
  const jobs = queue.jobNames
    .map(
      (jobName) => `    ${jobName}: {
      async send(args, options) {
        return createGeneratedQueueApi((env as Record<string, unknown>)['${queue.bindingName}'], { _job: '${jobName}', data: args }, options);
      },
      async sendBatch(messages) {
        return createGeneratedQueueBatchApi(
          (env as Record<string, unknown>)['${queue.bindingName}'],
          messages.map((message) => ({
            ...message,
            data: { _job: '${jobName}', data: message.data }
          }))
        );
      }
    }`
    )
    .join(',\n');

  return `  ${queue.exportName}: {\n${jobs}\n  }`;
}

function renderDurableApi(
  durableObject: ModernDiscoveredDurableObject,
  publicMethods: ModernDiscoveredDurableRegistration[],
  durableAlias: string
): string {
  const methodLines = publicMethods
    .map(
      (method) => `    async ${method.exportName}(key, args) {
      const namespace = (env as Record<string, unknown>)['${durableObject.bindingName}'];
      const name = getDurableObjectInternals(${durableAlias}).serializeKey(key);
      const stub = (namespace as DurableObjectNamespace).getByName(name);
      return stub.${method.exportName}(args);
    }`
    )
    .join(',\n');

  return `  ${durableObject.exportName}: {
${methodLines}${methodLines ? ',\n' : ''}    $raw: {
      namespace() {
        return (env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace;
      },
      idFromName(key) {
        return ((env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace).idFromName(
          getDurableObjectInternals(${durableAlias}).serializeKey(key)
        );
      },
      idFromString(id) {
        return ((env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace).idFromString(id);
      },
      newUniqueId(options) {
        return ((env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace).newUniqueId(options);
      },
      getByName(key) {
        return ((env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace).getByName(
          getDurableObjectInternals(${durableAlias}).serializeKey(key)
        );
      },
      get(id, options) {
        return ((env as Record<string, unknown>)['${durableObject.bindingName}'] as DurableObjectNamespace).get(id, options);
      }
    }
  }`;
}

function renderInternalDurableApi(
  durableObject: ModernDiscoveredDurableObject,
  internalMethods: ModernDiscoveredDurableRegistration[],
  durableAlias: string
): string {
  const methodLines = internalMethods
    .map(
      (method) => `      async ${method.exportName}(key, args) {
        const namespace = (env as Record<string, unknown>)['${durableObject.bindingName}'];
        const name = getDurableObjectInternals(${durableAlias}).serializeKey(key);
        const stub = (namespace as DurableObjectNamespace).getByName(name);
        return stub.${method.exportName}(args);
      }`
    )
    .join(',\n');

  return `    ${durableObject.exportName}: {\n${methodLines}\n    }`;
}

function renderDurableClass(
  durableObject: ModernDiscoveredDurableObject,
  durableAlias: string,
  publicMethods: ModernDiscoveredDurableRegistration[],
  internalMethods: ModernDiscoveredDurableRegistration[],
  fetchAlias: string | undefined,
  alarmAlias: string | undefined,
  initAlias: string | undefined,
  websocketAlias: string | undefined,
  registrationAliasMap: Map<string, string>
): string {
  const methods = [...publicMethods, ...internalMethods]
    .map((method) => {
      const alias = registrationAliasMap.get(method.id)!;
      return `  async ${method.exportName}(args: unknown): Promise<unknown> {
    await this.__betterCfReady;
    return invokeDurableFunction(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${alias}, args);
  }`;
    })
    .join('\n\n');

  const fetchBody = websocketAlias
    ? `    if (request.headers.get('upgrade')?.toLowerCase() === 'websocket') {
      return invokeDurableWebSocketConnect(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${websocketAlias}, request);
    }
${fetchAlias ? `    return invokeDurableFetch(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${fetchAlias}, request);` : `    return new Response('Not found', { status: 404 });`}`
    : fetchAlias
      ? `    return invokeDurableFetch(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${fetchAlias}, request);`
      : `    return new Response('Not found', { status: 404 });`;

  const initBlock = initAlias
    ? `    this.__betterCfReady = this.ctx.blockConcurrencyWhile(async () => {
      await invokeDurableInit(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${initAlias});
    });`
    : `    this.__betterCfReady = Promise.resolve();`;

  return `export class ${durableObject.className} {
  readonly ctx: DurableObjectState;
  readonly __betterCfEnv: unknown;
  readonly __betterCfExecutionCtx: ExecutionContext;
  readonly __betterCfReady: Promise<void>;

  constructor(ctx: DurableObjectState, env: unknown) {
    this.ctx = ctx;
    this.__betterCfEnv = env;
    this.__betterCfExecutionCtx = ctx as unknown as ExecutionContext;
${initBlock}
  }

${methods ? `${methods}\n\n` : ''}  async fetch(request: Request): Promise<Response> {
    await this.__betterCfReady;
${fetchBody}
  }

  async alarm(alarmInfo: AlarmInvocationInfo): Promise<void> {
    await this.__betterCfReady;
${alarmAlias ? `    await invokeDurableAlarm(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${alarmAlias}, alarmInfo);` : '    return;'}
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    await this.__betterCfReady;
${websocketAlias ? `    await invokeDurableWebSocketMessage(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${websocketAlias}, socket, message);` : '    return;'}
  }

  async webSocketClose(socket: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    await this.__betterCfReady;
${websocketAlias ? `    await invokeDurableWebSocketClose(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${websocketAlias}, socket, code, reason, wasClean);` : '    return;'}
  }

  async webSocketError(socket: WebSocket, error: unknown): Promise<void> {
    await this.__betterCfReady;
${websocketAlias ? `    await invokeDurableWebSocketError(this.__betterCfEnv, this.ctx, this.__betterCfExecutionCtx, ${websocketAlias}, socket, error);` : '    return;'}
  }
}`;
}

function renderTypesFile(discovery: ModernDiscoveryResult, outDir: string): string {
  const imports: string[] = [
    `import type { DurableFnArgs, DurableFnKey, DurableFnReturn, DurableObjectKey, QueuePayload, QueueJobPayload, SendBatchEntry, SendOptions } from 'better-cf/durable-object';`
  ];

  const bindingLines: string[] = [];
  const apiLines: string[] = [];
  const internalLines: string[] = [];

  discovery.queues.forEach((queue, index) => {
    const alias = `__queue_type_${index}`;
    imports.push(`import type { ${queue.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, queue.absoluteFilePath))};`);
    bindingLines.push(`    ${queue.bindingName}: Queue;`);

    if (queue.kind === 'single') {
      apiLines.push(`    ${queue.exportName}: {
      ${renderDoc(queue.description, `Send one message to queue "${queue.queueName}".`)}send(args: QueuePayload<typeof ${alias}>, options?: SendOptions): Promise<void>;
      ${renderDoc(queue.description, `Send many messages to queue "${queue.queueName}".`)}sendBatch(messages: SendBatchEntry<QueuePayload<typeof ${alias}>>[]): Promise<void>;
    };`);
    } else {
      const jobs = queue.jobNames
        .map(
          (jobName) => `      ${jobName}: {
        ${renderDoc(queue.description, `Send one ${jobName} job to queue "${queue.queueName}".`)}send(args: QueueJobPayload<typeof ${alias}.${jobName}>, options?: SendOptions): Promise<void>;
        ${renderDoc(queue.description, `Send many ${jobName} jobs to queue "${queue.queueName}".`)}sendBatch(messages: SendBatchEntry<QueueJobPayload<typeof ${alias}.${jobName}>>[]): Promise<void>;
      };`
        )
        .join('\n');
      apiLines.push(`    ${queue.exportName}: {\n${jobs}\n    };`);
    }
  });

  discovery.durableObjects.forEach((durableObject, index) => {
    const objectAlias = `__durable_type_${index}`;
    imports.push(
      `import type { ${durableObject.exportName} as ${objectAlias} } from ${JSON.stringify(toImportPath(outDir, durableObject.absoluteFilePath))};`
    );
    bindingLines.push(`    ${durableObject.bindingName}: DurableObjectNamespace;`);

    const registrations = discovery.durableRegistrations.filter((candidate) => candidate.ownerId === durableObject.id);
    const publicMethods = registrations.filter((candidate) => candidate.kind === 'fn');
    const internalMethods = registrations.filter((candidate) => candidate.kind === 'internal');

    publicMethods.forEach((method, methodIndex) => {
      const alias = `__durable_method_${index}_${methodIndex}`;
      imports.push(
        `import type { ${method.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, method.absoluteFilePath))};`
      );
    });
    internalMethods.forEach((method, methodIndex) => {
      const alias = `__durable_internal_${index}_${methodIndex}`;
      imports.push(
        `import type { ${method.exportName} as ${alias} } from ${JSON.stringify(toImportPath(outDir, method.absoluteFilePath))};`
      );
    });

    const publicMethodLines = publicMethods
      .map((method, methodIndex) => {
        const alias = `__durable_method_${index}_${methodIndex}`;
        return `      ${renderDoc(method.description, `Invoke durable method "${method.exportName}" on ${durableObject.objectName}.`)}${method.exportName}(key: DurableFnKey<typeof ${alias}>, args: DurableFnArgs<typeof ${alias}>): Promise<DurableFnReturn<typeof ${alias}>>;`;
      })
      .join('\n');

    apiLines.push(`    ${durableObject.exportName}: {
${publicMethodLines}
      ${renderDoc(durableObject.description, `Access raw Cloudflare Durable Object primitives for ${durableObject.objectName}.`)}$raw: {
        namespace(): DurableObjectNamespace;
        idFromName(key: DurableObjectKey<typeof ${objectAlias}>): ReturnType<DurableObjectNamespace['idFromName']>;
        idFromString(id: string): ReturnType<DurableObjectNamespace['idFromString']>;
        newUniqueId(options?: Parameters<DurableObjectNamespace['newUniqueId']>[0]): ReturnType<DurableObjectNamespace['newUniqueId']>;
        getByName(key: DurableObjectKey<typeof ${objectAlias}>): ReturnType<DurableObjectNamespace['getByName']>;
        get(
          id: Parameters<DurableObjectNamespace['get']>[0],
          options?: Parameters<DurableObjectNamespace['get']>[1]
        ): ReturnType<DurableObjectNamespace['get']>;
      };
    };`);

    if (internalMethods.length > 0) {
      const internalMethodLines = internalMethods
        .map((method, methodIndex) => {
          const alias = `__durable_internal_${index}_${methodIndex}`;
          return `      ${renderDoc(method.description, `Invoke internal durable method "${method.exportName}" on ${durableObject.objectName}.`)}${method.exportName}(key: DurableFnKey<typeof ${alias}>, args: DurableFnArgs<typeof ${alias}>): Promise<DurableFnReturn<typeof ${alias}>>;`;
        })
        .join('\n');
      internalLines.push(`      ${durableObject.exportName}: {\n${internalMethodLines}\n      };`);
    }
  });

  const internalBlock = internalLines.length > 0 ? `\n  interface BetterCfGeneratedApi {\n${apiLines.join('\n')}\n    $internal: {\n${internalLines.join('\n')}\n    };\n  }\n` : `\n  interface BetterCfGeneratedApi {\n${apiLines.join('\n')}\n  }\n`;

  return `// Auto-generated by better-cf. Do not edit.
/// <reference path="./wrangler-env.d.ts" />
${imports.join('\n')}

declare module 'better-cf/durable-object' {
  interface BetterCfGeneratedBindings {
${bindingLines.join('\n')}
  }
${internalBlock}
  interface BetterCfAutoEnv extends BetterCfGeneratedBindings, BetterCfWranglerEnv {}
}

export {};
`;
}

function renderDoc(description: string | undefined, fallback: string): string {
  const text = description ?? fallback;
  return `/** ${text.replace(/\*\//g, '*\\/')} */\n`;
}

function toImportPath(fromDir: string, targetFile: string): string {
  const relative = path.relative(fromDir, targetFile).replace(/\\/g, '/');
  if (relative.startsWith('.')) {
    return relative.replace(/\.tsx?$/, '');
  }
  return `./${relative.replace(/\.tsx?$/, '')}`;
}
