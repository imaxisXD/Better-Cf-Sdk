import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { runCommand } from '../process.js';

interface QueueConfigOptions {
  deliveryDelaySecs?: number;
  messageRetentionPeriodSecs?: number;
}

interface WorkerConsumerOptions {
  batchSize?: number;
  batchTimeout?: number;
  messageRetries?: number;
  deadLetterQueue?: string;
  maxConcurrency?: number;
  retryDelaySecs?: number;
}

interface HttpConsumerOptions {
  batchSize?: number;
  messageRetries?: number;
  deadLetterQueue?: string;
  visibilityTimeoutSecs?: number;
  retryDelaySecs?: number;
}

interface SubscriptionCreateOptions {
  source: string;
  events: string;
  name?: string;
  enabled?: boolean;
  modelName?: string;
  workerName?: string;
  workflowName?: string;
}

interface SubscriptionListOptions {
  page?: number;
  perPage?: number;
  json?: boolean;
}

interface SubscriptionGetOptions {
  json?: boolean;
}

interface SubscriptionUpdateOptions {
  name?: string;
  events?: string;
  enabled?: boolean;
  json?: boolean;
}

interface SubscriptionDeleteOptions {
  force?: boolean;
}

async function runWranglerQueueSubcommand(
  args: string[],
  rootDir = process.cwd(),
  summary = 'Wrangler queue command failed.'
): Promise<void> {
  logger.section(`wrangler ${args.join(' ')}`);
  const code = await runCommand('npx', ['wrangler', ...args], rootDir, 'inherit');
  if (code !== 0) {
    throw new CliError({
      code: 'WRANGLER_QUEUE_COMMAND_FAILED',
      summary,
      details: `Command "wrangler ${args.join(' ')}" exited with code ${code}.`,
      hint: 'Verify wrangler auth/project configuration and command arguments.',
      docsUrl: 'https://developers.cloudflare.com/queues/reference/wrangler-commands/'
    });
  }
}

export async function queueListCommand(rootDir = process.cwd()): Promise<void> {
  await runWranglerQueueSubcommand(['queues', 'list'], rootDir, 'Failed to list queues.');
}

export async function queueCreateCommand(
  name: string,
  options: QueueConfigOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', name);
  const args = ['queues', 'create', name];
  pushNumberOption(args, '--delivery-delay-secs', options.deliveryDelaySecs);
  pushNumberOption(args, '--message-retention-period-secs', options.messageRetentionPeriodSecs);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to create queue "${name}".`
  );
}

export async function queueUpdateCommand(
  name: string,
  options: QueueConfigOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', name);
  const args = ['queues', 'update', name];
  pushNumberOption(args, '--delivery-delay-secs', options.deliveryDelaySecs);
  pushNumberOption(args, '--message-retention-period-secs', options.messageRetentionPeriodSecs);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to update queue "${name}".`
  );
}

export async function queueDeleteCommand(name: string, rootDir = process.cwd()): Promise<void> {
  assertWranglerToken('queue name', name);
  await runWranglerQueueSubcommand(
    ['queues', 'delete', name],
    rootDir,
    `Failed to delete queue "${name}".`
  );
}

export async function queueInfoCommand(name: string, rootDir = process.cwd()): Promise<void> {
  assertWranglerToken('queue name', name);
  await runWranglerQueueSubcommand(['queues', 'info', name], rootDir, `Failed to get queue "${name}".`);
}

export async function queuePauseCommand(name: string, rootDir = process.cwd()): Promise<void> {
  assertWranglerToken('queue name', name);
  await runWranglerQueueSubcommand(
    ['queues', 'pause-delivery', name],
    rootDir,
    `Failed to pause queue "${name}".`
  );
}

export async function queueResumeCommand(name: string, rootDir = process.cwd()): Promise<void> {
  assertWranglerToken('queue name', name);
  await runWranglerQueueSubcommand(
    ['queues', 'resume-delivery', name],
    rootDir,
    `Failed to resume queue "${name}".`
  );
}

export async function queuePurgeCommand(name: string, rootDir = process.cwd()): Promise<void> {
  assertWranglerToken('queue name', name);
  await runWranglerQueueSubcommand(
    ['queues', 'purge', name],
    rootDir,
    `Failed to purge queue "${name}".`
  );
}

export async function queueConsumerHttpAddCommand(
  queue: string,
  options: HttpConsumerOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  const args = ['queues', 'consumer', 'http', 'add', queue];
  pushNumberOption(args, '--batch-size', options.batchSize);
  pushNumberOption(args, '--message-retries', options.messageRetries);
  pushStringOption(args, '--dead-letter-queue', options.deadLetterQueue);
  pushNumberOption(args, '--visibility-timeout-secs', options.visibilityTimeoutSecs);
  pushNumberOption(args, '--retry-delay-secs', options.retryDelaySecs);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to add HTTP consumer for queue "${queue}".`
  );
}

export async function queueConsumerHttpRemoveCommand(
  queue: string,
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  await runWranglerQueueSubcommand(
    ['queues', 'consumer', 'http', 'remove', queue],
    rootDir,
    `Failed to remove HTTP consumer for queue "${queue}".`
  );
}

export async function queueConsumerWorkerAddCommand(
  queue: string,
  script: string,
  options: WorkerConsumerOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('worker script name', script);
  const args = ['queues', 'consumer', 'worker', 'add', queue, script];
  pushNumberOption(args, '--batch-size', options.batchSize);
  pushNumberOption(args, '--batch-timeout', options.batchTimeout);
  pushNumberOption(args, '--message-retries', options.messageRetries);
  pushStringOption(args, '--dead-letter-queue', options.deadLetterQueue);
  pushNumberOption(args, '--max-concurrency', options.maxConcurrency);
  pushNumberOption(args, '--retry-delay-secs', options.retryDelaySecs);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to add worker consumer for queue "${queue}".`
  );
}

export async function queueConsumerWorkerRemoveCommand(
  queue: string,
  script: string,
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('worker script name', script);
  await runWranglerQueueSubcommand(
    ['queues', 'consumer', 'worker', 'remove', queue, script],
    rootDir,
    `Failed to remove worker consumer for queue "${queue}".`
  );
}

export async function subscriptionListCommand(
  queue: string,
  options: SubscriptionListOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  const args = ['queues', 'subscription', 'list', queue];
  pushNumberOption(args, '--page', options.page);
  pushNumberOption(args, '--per-page', options.perPage);
  pushBooleanFlag(args, '--json', options.json);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    'Failed to list queue subscriptions.'
  );
}

export async function subscriptionCreateCommand(
  queue: string,
  options: SubscriptionCreateOptions,
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('subscription source', options.source);
  const args = ['queues', 'subscription', 'create', queue, '--source', options.source, '--events', options.events];
  pushStringOption(args, '--name', options.name);
  pushBooleanOption(args, '--enabled', options.enabled);
  pushStringOption(args, '--model-name', options.modelName);
  pushStringOption(args, '--worker-name', options.workerName);
  pushStringOption(args, '--workflow-name', options.workflowName);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    'Failed to create queue subscription.'
  );
}

export async function subscriptionGetCommand(
  queue: string,
  id: string,
  options: SubscriptionGetOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('subscription id', id);
  const args = ['queues', 'subscription', 'get', queue, '--id', id];
  pushBooleanFlag(args, '--json', options.json);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to get queue subscription "${id}" from "${queue}".`
  );
}

export async function subscriptionUpdateCommand(
  queue: string,
  id: string,
  options: SubscriptionUpdateOptions,
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('subscription id', id);
  const args = ['queues', 'subscription', 'update', queue, '--id', id];
  pushStringOption(args, '--name', options.name);
  pushStringOption(args, '--events', options.events);
  pushBooleanOption(args, '--enabled', options.enabled);
  pushBooleanFlag(args, '--json', options.json);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to update queue subscription "${id}" on "${queue}".`
  );
}

export async function subscriptionDeleteCommand(
  queue: string,
  id: string,
  options: SubscriptionDeleteOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  assertWranglerToken('queue name', queue);
  assertWranglerToken('subscription id', id);
  const args = ['queues', 'subscription', 'delete', queue, '--id', id];
  pushBooleanFlag(args, '--force', options.force);

  await runWranglerQueueSubcommand(
    args,
    rootDir,
    `Failed to delete queue subscription "${id}" from "${queue}".`
  );
}

function pushStringOption(target: string[], flag: string, value: string | undefined): void {
  if (value && value.length > 0) {
    target.push(flag, value);
  }
}

function pushNumberOption(target: string[], flag: string, value: number | undefined): void {
  if (value !== undefined) {
    target.push(flag, String(value));
  }
}

function pushBooleanOption(target: string[], flag: string, value: boolean | undefined): void {
  if (value !== undefined) {
    target.push(flag, String(value));
  }
}

function pushBooleanFlag(target: string[], flag: string, value: boolean | undefined): void {
  if (value) {
    target.push(flag);
  }
}

function assertWranglerToken(label: string, value: string): void {
  if (!value || value.trim().length === 0) {
    throw new CliError({
      code: 'INVALID_WRANGLER_ARGUMENT',
      summary: `Invalid ${label}.`,
      details: 'Value cannot be empty.',
      hint: `Provide a non-empty ${label}.`
    });
  }

  if (value.startsWith('-')) {
    throw new CliError({
      code: 'INVALID_WRANGLER_ARGUMENT',
      summary: `Invalid ${label}.`,
      details: `Value "${value}" starts with "-" and may be interpreted as a CLI flag.`,
      hint: `Use a ${label} that does not start with "-".`
    });
  }
}
