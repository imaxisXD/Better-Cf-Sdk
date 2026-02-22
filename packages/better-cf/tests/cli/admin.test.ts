import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  queueConsumerHttpAddCommand,
  queueConsumerHttpRemoveCommand,
  queueConsumerWorkerAddCommand,
  queueConsumerWorkerRemoveCommand,
  queueCreateCommand,
  queueInfoCommand,
  queuePauseCommand,
  queueResumeCommand,
  queueUpdateCommand,
  subscriptionCreateCommand,
  subscriptionDeleteCommand,
  subscriptionGetCommand,
  subscriptionListCommand,
  subscriptionUpdateCommand
} from '../../src/cli/commands/admin.js';
import { CliError } from '../../src/cli/errors.js';

const runCommandMock = vi.hoisted(() => vi.fn(async () => 0));

vi.mock('../../src/cli/process.js', () => ({
  runCommand: runCommandMock
}));

describe('admin command wrappers', () => {
  const cwd = '/tmp/project';

  beforeEach(() => {
    runCommandMock.mockReset();
    runCommandMock.mockResolvedValue(0);
  });

  it('maps queue info/pause/resume to current wrangler command names', async () => {
    await queueInfoCommand('email', cwd);
    await queuePauseCommand('email', cwd);
    await queueResumeCommand('email', cwd);

    expect(runCommandMock).toHaveBeenNthCalledWith(
      1,
      'npx',
      ['wrangler', 'queues', 'info', 'email'],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      2,
      'npx',
      ['wrangler', 'queues', 'pause-delivery', 'email'],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      3,
      'npx',
      ['wrangler', 'queues', 'resume-delivery', 'email'],
      cwd,
      'inherit'
    );
  });

  it('passes queue create/update optional config flags', async () => {
    await queueCreateCommand('email', { deliveryDelaySecs: 10, messageRetentionPeriodSecs: 3600 }, cwd);
    await queueUpdateCommand('email', { messageRetentionPeriodSecs: 7200 }, cwd);

    expect(runCommandMock).toHaveBeenNthCalledWith(
      1,
      'npx',
      [
        'wrangler',
        'queues',
        'create',
        'email',
        '--delivery-delay-secs',
        '10',
        '--message-retention-period-secs',
        '3600'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      2,
      'npx',
      ['wrangler', 'queues', 'update', 'email', '--message-retention-period-secs', '7200'],
      cwd,
      'inherit'
    );
  });

  it('maps http/worker consumer add/remove args', async () => {
    await queueConsumerHttpAddCommand(
      'email',
      {
        batchSize: 50,
        messageRetries: 3,
        deadLetterQueue: 'dead-email',
        visibilityTimeoutSecs: 30,
        retryDelaySecs: 5
      },
      cwd
    );
    await queueConsumerHttpRemoveCommand('email', cwd);
    await queueConsumerWorkerAddCommand(
      'email',
      'my-worker',
      {
        batchSize: 20,
        batchTimeout: 10,
        messageRetries: 2,
        deadLetterQueue: 'dead-email',
        maxConcurrency: 5,
        retryDelaySecs: 3
      },
      cwd
    );
    await queueConsumerWorkerRemoveCommand('email', 'my-worker', cwd);

    expect(runCommandMock).toHaveBeenNthCalledWith(
      1,
      'npx',
      [
        'wrangler',
        'queues',
        'consumer',
        'http',
        'add',
        'email',
        '--batch-size',
        '50',
        '--message-retries',
        '3',
        '--dead-letter-queue',
        'dead-email',
        '--visibility-timeout-secs',
        '30',
        '--retry-delay-secs',
        '5'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      2,
      'npx',
      ['wrangler', 'queues', 'consumer', 'http', 'remove', 'email'],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      3,
      'npx',
      [
        'wrangler',
        'queues',
        'consumer',
        'worker',
        'add',
        'email',
        'my-worker',
        '--batch-size',
        '20',
        '--batch-timeout',
        '10',
        '--message-retries',
        '2',
        '--dead-letter-queue',
        'dead-email',
        '--max-concurrency',
        '5',
        '--retry-delay-secs',
        '3'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      4,
      'npx',
      ['wrangler', 'queues', 'consumer', 'worker', 'remove', 'email', 'my-worker'],
      cwd,
      'inherit'
    );
  });

  it('maps subscription commands to queue-scoped wrangler args', async () => {
    await subscriptionListCommand('email', { page: 2, perPage: 25, json: true }, cwd);
    await subscriptionCreateCommand(
      'email',
      {
        source: 'email',
        events: 'message.acked',
        name: 'email-sub',
        enabled: true,
        workerName: 'worker-a'
      },
      cwd
    );
    await subscriptionGetCommand('email', 'sub-1', { json: true }, cwd);
    await subscriptionUpdateCommand(
      'email',
      'sub-1',
      { name: 'email-sub-2', events: 'message.retried', enabled: false, json: true },
      cwd
    );
    await subscriptionDeleteCommand('email', 'sub-1', { force: true }, cwd);

    expect(runCommandMock).toHaveBeenNthCalledWith(
      1,
      'npx',
      [
        'wrangler',
        'queues',
        'subscription',
        'list',
        'email',
        '--page',
        '2',
        '--per-page',
        '25',
        '--json'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      2,
      'npx',
      [
        'wrangler',
        'queues',
        'subscription',
        'create',
        'email',
        '--source',
        'email',
        '--events',
        'message.acked',
        '--name',
        'email-sub',
        '--enabled',
        'true',
        '--worker-name',
        'worker-a'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      3,
      'npx',
      ['wrangler', 'queues', 'subscription', 'get', 'email', '--id', 'sub-1', '--json'],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      4,
      'npx',
      [
        'wrangler',
        'queues',
        'subscription',
        'update',
        'email',
        '--id',
        'sub-1',
        '--name',
        'email-sub-2',
        '--events',
        'message.retried',
        '--enabled',
        'false',
        '--json'
      ],
      cwd,
      'inherit'
    );
    expect(runCommandMock).toHaveBeenNthCalledWith(
      5,
      'npx',
      ['wrangler', 'queues', 'subscription', 'delete', 'email', '--id', 'sub-1', '--force'],
      cwd,
      'inherit'
    );
  });

  it('throws CliError with wrapper metadata when wrangler fails', async () => {
    runCommandMock.mockResolvedValueOnce(1);

    await expect(queueInfoCommand('email', cwd)).rejects.toMatchObject({
      code: 'WRANGLER_QUEUE_COMMAND_FAILED',
      summary: 'Failed to get queue "email".'
    } satisfies Partial<CliError>);
  });

  it('rejects unsafe token-like arguments before invoking wrangler', async () => {
    await expect(queueInfoCommand('--help', cwd)).rejects.toMatchObject({
      code: 'INVALID_WRANGLER_ARGUMENT'
    } satisfies Partial<CliError>);
    await expect(subscriptionGetCommand('email', '--id', {}, cwd)).rejects.toMatchObject({
      code: 'INVALID_WRANGLER_ARGUMENT'
    } satisfies Partial<CliError>);

    expect(runCommandMock).not.toHaveBeenCalled();
  });
});
