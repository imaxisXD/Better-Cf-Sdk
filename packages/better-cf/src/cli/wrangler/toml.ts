import fs from 'node:fs';
import path from 'node:path';
import type { DiscoveryResult } from '../types.js';
import { parseDurationMsStrict, parseDurationSecondsStrict } from './duration.js';

const START_MARKER = '# --- better-cf:start ---';
const END_MARKER = '# --- better-cf:end ---';

export function patchTomlConfig(filePath: string, discovery: DiscoveryResult): void {
  let content = fs.readFileSync(filePath, 'utf8');

  content = ensureMainEntry(content);

  const generatedSection = renderQueueSection(discovery);

  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex >= 0 && endIndex > startIndex) {
    const head = content.slice(0, startIndex + START_MARKER.length);
    const tail = content.slice(endIndex);
    content = `${head}\n${generatedSection}\n${tail}`;
  } else {
    content = `${content.trimEnd()}\n\n${START_MARKER}\n${generatedSection}\n${END_MARKER}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

export function ensureTomlExists(rootDir: string): string {
  const filePath = path.join(rootDir, 'wrangler.toml');
  if (!fs.existsSync(filePath)) {
    const date = new Date().toISOString().split('T')[0];
    const initial = `name = "my-worker"\nmain = ".better-cf/entry.ts"\ncompatibility_date = "${date}"\n\n${START_MARKER}\n${END_MARKER}\n`;
    fs.writeFileSync(filePath, initial, 'utf8');
  }
  return filePath;
}

function ensureMainEntry(content: string): string {
  if (/^main\s*=\s*".*"/m.test(content)) {
    return content.replace(/^main\s*=\s*".*"/m, 'main = ".better-cf/entry.ts"');
  }

  return `main = ".better-cf/entry.ts"\n${content}`;
}

function renderQueueSection(discovery: DiscoveryResult): string {
  const lines: string[] = [];

  for (const queue of discovery.queues) {
    lines.push('[[queues.producers]]');
    lines.push(`queue = ${toTomlString(queue.queueName)}`);
    lines.push(`binding = ${toTomlString(queue.bindingName)}`);

    if (queue.config.deliveryDelay !== undefined) {
      lines.push(
        `delivery_delay = ${parseDurationSecondsStrict(
          queue.config.deliveryDelay,
          `${queue.queueName}.deliveryDelay`
        )}`
      );
    }

    lines.push('');

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

  return lines.join('\n').trimEnd();
}

function toTomlString(value: string): string {
  return `"${value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')}"`;
}
