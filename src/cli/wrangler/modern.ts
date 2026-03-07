import fs from 'node:fs';
import path from 'node:path';
import MagicString from 'magic-string';
import { applyEdits, modify, parse } from 'jsonc-parser';
import type { ModernDiscoveryResult } from '../modern-types.js';
import type { CliConfig } from '../types.js';
import { parseDurationMsStrict, parseDurationSecondsStrict } from './duration.js';

const START_MARKER = '# --- better-cf:start ---';
const END_MARKER = '# --- better-cf:end ---';

interface ManagedMigrationState {
  version: number;
  knownClasses: string[];
  migrations: Array<{ tag: string; newSqliteClasses: string[] }>;
}

export function patchModernWranglerConfig(config: CliConfig, discovery: ModernDiscoveryResult): string {
  const existing = detectWranglerConfig(config.rootDir);
  const migrations = updateManagedMigrationState(config.rootDir, discovery);

  if (existing && (existing.endsWith('.jsonc') || existing.endsWith('.json'))) {
    patchModernJsoncConfig(existing, discovery, migrations);
    return existing;
  }

  const target = existing && existing.endsWith('.toml') ? existing : ensureTomlExists(config.rootDir);
  patchModernTomlConfig(target, discovery, migrations);
  return target;
}

function patchModernTomlConfig(
  filePath: string,
  discovery: ModernDiscoveryResult,
  migrations: Array<{ tag: string; newSqliteClasses: string[] }>
): void {
  let content = fs.readFileSync(filePath, 'utf8');
  content = ensureMainEntry(content);

  const generatedSection = renderModernTomlSection(discovery, migrations);
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex >= 0 && endIndex > startIndex) {
    const magic = new MagicString(content);
    magic.overwrite(startIndex + START_MARKER.length, endIndex, `\n${generatedSection}\n`);
    content = magic.toString();
  } else {
    content = `${content.trimEnd()}\n\n${START_MARKER}\n${generatedSection}\n${END_MARKER}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function patchModernJsoncConfig(
  filePath: string,
  discovery: ModernDiscoveryResult,
  migrations: Array<{ tag: string; newSqliteClasses: string[] }>
): void {
  let text = fs.readFileSync(filePath, 'utf8');

  text = applyEdits(
    text,
    modify(text, ['main'], '.better-cf/entry.ts', {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  const queues = buildJsoncQueues(discovery);
  const durableObjects = {
    bindings: discovery.durableObjects.map((durableObject) => ({
      name: durableObject.bindingName,
      class_name: durableObject.className
    }))
  };

  text = applyEdits(
    text,
    modify(text, ['queues'], queues, {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  text = applyEdits(
    text,
    modify(text, ['durable_objects'], durableObjects, {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  text = applyEdits(
    text,
    modify(text, ['migrations'], migrations.map((migration) => ({
      tag: migration.tag,
      new_sqlite_classes: migration.newSqliteClasses
    })), {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  fs.writeFileSync(filePath, text, 'utf8');
}

function renderModernTomlSection(
  discovery: ModernDiscoveryResult,
  migrations: Array<{ tag: string; newSqliteClasses: string[] }>
): string {
  const lines: string[] = [];
  const queueConsumers = new Set(
    discovery.queueConsumers
      .filter((consumer) => consumer.kind !== 'job-message')
      .map((consumer) => consumer.ownerId)
  );
  const multiQueueConsumers = new Set(
    discovery.queueConsumers.filter((consumer) => consumer.kind === 'job-message').map((consumer) => consumer.ownerId)
  );

  for (const queue of discovery.queues) {
    lines.push('[[queues.producers]]');
    lines.push(`queue = ${toTomlString(queue.queueName)}`);
    lines.push(`binding = ${toTomlString(queue.bindingName)}`);
    if (queue.config.deliveryDelay !== undefined) {
      lines.push(
        `delivery_delay = ${parseDurationSecondsStrict(queue.config.deliveryDelay, `${queue.queueName}.deliveryDelay`)}`
      );
    }
    lines.push('');

    if (
      queue.config.consumerType === 'http_pull' ||
      queueConsumers.has(queue.id) ||
      multiQueueConsumers.has(queue.id)
    ) {
      lines.push('[[queues.consumers]]');
      lines.push(`queue = ${toTomlString(queue.queueName)}`);

      if (queue.config.consumerType === 'http_pull') {
        lines.push(`type = ${toTomlString('http_pull')}`);
        if (queue.config.visibilityTimeout !== undefined) {
          lines.push(
            `visibility_timeout_ms = ${parseDurationMsStrict(
              queue.config.visibilityTimeout,
              `${queue.queueName}.visibilityTimeout`
            )}`
          );
        }
      } else {
        if (queue.config.batchMaxSize !== undefined) {
          lines.push(`max_batch_size = ${queue.config.batchMaxSize}`);
        }
        if (queue.config.batchTimeout !== undefined) {
          lines.push(
            `max_batch_timeout = ${parseDurationSecondsStrict(
              queue.config.batchTimeout,
              `${queue.queueName}.batch.timeout`
            )}`
          );
        }
        if (queue.config.maxConcurrency !== undefined) {
          lines.push(`max_concurrency = ${queue.config.maxConcurrency}`);
        }
      }

      if (queue.config.retry !== undefined) {
        lines.push(`max_retries = ${queue.config.retry}`);
      }
      if (queue.config.deadLetter !== undefined) {
        lines.push(`dead_letter_queue = ${toTomlString(queue.config.deadLetter)}`);
      }
      if (queue.config.retryDelay !== undefined) {
        lines.push(
          `retry_delay = ${parseDurationSecondsStrict(queue.config.retryDelay, `${queue.queueName}.retryDelay`)}`
        );
      }
      lines.push('');
    }
  }

  for (const durableObject of discovery.durableObjects) {
    lines.push('[[durable_objects.bindings]]');
    lines.push(`name = ${toTomlString(durableObject.bindingName)}`);
    lines.push(`class_name = ${toTomlString(durableObject.className)}`);
    lines.push('');
  }

  for (const migration of migrations) {
    lines.push('[[migrations]]');
    lines.push(`tag = ${toTomlString(migration.tag)}`);
    lines.push(`new_sqlite_classes = [${migration.newSqliteClasses.map(toTomlString).join(', ')}]`);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function buildJsoncQueues(discovery: ModernDiscoveryResult) {
  const queueConsumers = new Set(
    discovery.queueConsumers
      .filter((consumer) => consumer.kind !== 'job-message')
      .map((consumer) => consumer.ownerId)
  );
  const multiQueueConsumers = new Set(
    discovery.queueConsumers.filter((consumer) => consumer.kind === 'job-message').map((consumer) => consumer.ownerId)
  );

  const producers = discovery.queues.map((queue) => ({
    queue: queue.queueName,
    binding: queue.bindingName,
    ...(queue.config.deliveryDelay !== undefined
      ? { delivery_delay: parseDurationSecondsStrict(queue.config.deliveryDelay, `${queue.queueName}.deliveryDelay`) }
      : {})
  }));

  const consumers = discovery.queues
    .filter(
      (queue) =>
        queue.config.consumerType === 'http_pull' || queueConsumers.has(queue.id) || multiQueueConsumers.has(queue.id)
    )
    .map((queue) => {
      const base = {
        queue: queue.queueName,
        ...(queue.config.retry !== undefined ? { max_retries: queue.config.retry } : {}),
        ...(queue.config.deadLetter !== undefined ? { dead_letter_queue: queue.config.deadLetter } : {}),
        ...(queue.config.retryDelay !== undefined
          ? { retry_delay: parseDurationSecondsStrict(queue.config.retryDelay, `${queue.queueName}.retryDelay`) }
          : {})
      };

      if (queue.config.consumerType === 'http_pull') {
        return {
          ...base,
          type: 'http_pull',
          ...(queue.config.visibilityTimeout !== undefined
            ? {
                visibility_timeout_ms: parseDurationMsStrict(
                  queue.config.visibilityTimeout,
                  `${queue.queueName}.visibilityTimeout`
                )
              }
            : {})
        };
      }

      return {
        ...base,
        ...(queue.config.batchMaxSize !== undefined ? { max_batch_size: queue.config.batchMaxSize } : {}),
        ...(queue.config.batchTimeout !== undefined
          ? { max_batch_timeout: parseDurationSecondsStrict(queue.config.batchTimeout, `${queue.queueName}.batch.timeout`) }
          : {}),
        ...(queue.config.maxConcurrency !== undefined ? { max_concurrency: queue.config.maxConcurrency } : {})
      };
    });

  return {
    producers,
    consumers,
    better_cf_managed: true
  };
}

function updateManagedMigrationState(
  rootDir: string,
  discovery: ModernDiscoveryResult
): Array<{ tag: string; newSqliteClasses: string[] }> {
  const outDir = path.join(rootDir, '.better-cf');
  fs.mkdirSync(outDir, { recursive: true });
  const statePath = path.join(outDir, 'durable-migrations.json');
  const classNames = discovery.durableObjects.map((durableObject) => durableObject.className);

  let state: ManagedMigrationState = {
    version: 0,
    knownClasses: [],
    migrations: []
  };

  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as ManagedMigrationState;
    } catch {
      state = {
        version: 0,
        knownClasses: [],
        migrations: []
      };
    }
  }

  state.migrations ??=
    state.version > 0 && state.knownClasses.length > 0
      ? [
          {
            tag: 'better-cf-v1',
            newSqliteClasses: state.knownClasses
          }
        ]
      : [];

  const newClasses = classNames.filter((className) => !state.knownClasses.includes(className));

  if (state.version === 0 && classNames.length > 0) {
    const migration = {
      tag: 'better-cf-v1',
      newSqliteClasses: classNames
    };
    state = {
      version: 1,
      knownClasses: classNames,
      migrations: [migration]
    };
  } else if (newClasses.length > 0) {
    const migration = {
      tag: `better-cf-v${state.version + 1}`,
      newSqliteClasses: newClasses
    };
    state = {
      version: state.version + 1,
      knownClasses: [...state.knownClasses, ...newClasses],
      migrations: [...state.migrations, migration]
    };
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  return state.migrations;
}

function detectWranglerConfig(rootDir: string): string | undefined {
  const preferred = ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml'];
  for (const fileName of preferred) {
    const absolutePath = path.join(rootDir, fileName);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  if (fs.existsSync(path.join(rootDir, 'package.json')) && fs.existsSync(path.join(rootDir, 'src'))) {
    return ensureJsoncExists(rootDir);
  }

  return undefined;
}

function ensureMainEntry(content: string): string {
  if (/^main\s*=\s*".*"/m.test(content)) {
    return content.replace(/^main\s*=\s*".*"/m, 'main = ".better-cf/entry.ts"');
  }

  return `main = ".better-cf/entry.ts"\n${content}`;
}

function ensureTomlExists(rootDir: string): string {
  const filePath = path.join(rootDir, 'wrangler.toml');
  if (!fs.existsSync(filePath)) {
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(
      filePath,
      `name = "my-worker"\nmain = ".better-cf/entry.ts"\ncompatibility_date = "${date}"\n\n${START_MARKER}\n${END_MARKER}\n`,
      'utf8'
    );
  }
  return filePath;
}

function ensureJsoncExists(rootDir: string): string {
  const filePath = path.join(rootDir, 'wrangler.jsonc');
  if (!fs.existsSync(filePath)) {
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(
      filePath,
      `{\n  "$schema": "node_modules/wrangler/config-schema.json",\n  "name": "my-worker",\n  "main": ".better-cf/entry.ts",\n  "compatibility_date": "${date}",\n  "queues": {\n    "producers": [],\n    "consumers": []\n  },\n  "durable_objects": {\n    "bindings": []\n  },\n  "migrations": []\n}\n`,
      'utf8'
    );
  } else {
    const parsed = parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    if (!parsed.queues) {
      patchModernJsoncConfig(
        filePath,
        {
          hasModernSurface: true,
          durableObjects: [],
          durableRegistrations: [],
          queues: [],
          queueConsumers: [],
          diagnostics: []
        },
        []
      );
    }
  }
  return filePath;
}

function toTomlString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;
}
