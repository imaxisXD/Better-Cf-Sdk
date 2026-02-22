import fs from 'node:fs';
import path from 'node:path';
import { applyEdits, modify, parse } from 'jsonc-parser';
import type { DiscoveryResult } from '../types.js';
import { parseDurationMsStrict, parseDurationSecondsStrict } from './duration.js';

export function patchJsoncConfig(filePath: string, discovery: DiscoveryResult): void {
  let text = fs.readFileSync(filePath, 'utf8');

  text = applyEdits(
    text,
    modify(text, ['main'], '.better-cf/entry.ts', {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  const producers = discovery.queues.map((queue) => ({
    queue: queue.queueName,
    binding: queue.bindingName,
    ...(queue.config.deliveryDelay !== undefined
      ? { delivery_delay: parseDurationSecondsStrict(queue.config.deliveryDelay, `${queue.queueName}.deliveryDelay`) }
      : {})
  }));

  const consumers = discovery.queues.map((queue) => {
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
      ...(queue.config.maxConcurrency !== undefined
        ? { max_concurrency: queue.config.maxConcurrency }
        : {})
    };
  });

  text = applyEdits(
    text,
    modify(text, ['queues'], { producers, consumers, better_cf_managed: true }, {
      formattingOptions: { insertSpaces: true, tabSize: 2 }
    })
  );

  fs.writeFileSync(filePath, text, 'utf8');
}

export function ensureJsoncExists(rootDir: string): string {
  const filePath = path.join(rootDir, 'wrangler.jsonc');
  if (!fs.existsSync(filePath)) {
    const date = new Date().toISOString().split('T')[0];
    const content = `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": ".better-cf/entry.ts",
  "compatibility_date": "${date}",
  "queues": {
    "producers": [],
    "consumers": []
  }
}\n`;
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    const parsed = parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
    if (!parsed.queues) {
      patchJsoncConfig(filePath, { queues: [], diagnostics: [] });
    }
  }
  return filePath;
}
