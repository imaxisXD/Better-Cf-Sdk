import { Command } from 'commander';
import {
  queueConsumerHttpAddCommand,
  queueConsumerHttpRemoveCommand,
  queueConsumerWorkerAddCommand,
  queueConsumerWorkerRemoveCommand,
  queueCreateCommand,
  queueDeleteCommand,
  queueInfoCommand,
  queueListCommand,
  queuePauseCommand,
  queuePurgeCommand,
  queueResumeCommand,
  queueUpdateCommand,
  subscriptionCreateCommand,
  subscriptionDeleteCommand,
  subscriptionGetCommand,
  subscriptionListCommand,
  subscriptionUpdateCommand
} from './commands/admin.js';
import { deployCommand } from './commands/deploy.js';
import { devCommand } from './commands/dev.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import { CliError } from './errors.js';
import { toCliError } from './errors.js';
import { logger } from './logger.js';

export async function run(argv = process.argv.slice(2)): Promise<void> {
  const program = new Command();

  program.name('better-cf').description('better-cf queue SDK CLI').version('0.2.1');

  program.command('init').description('Initialize better-cf in the current project').action(async () => {
    await initCommand();
  });

  program.command('generate').description('Scan queues and regenerate .better-cf files').action(async () => {
    await generateCommand();
  });

  program
    .command('dev')
    .description('Run local development with queue codegen and wrangler dev')
    .option('-p, --port <port>', 'Port to pass to wrangler dev', '8787')
    .option('--no-watch', 'Disable file watcher')
    .option('--remote', 'Pass through remote mode (blocked for queues)')
    .action(async (options: { port: string; watch: boolean; remote: boolean }) => {
      await devCommand(options);
    });

  program.command('deploy').description('Generate and deploy via wrangler deploy').action(async () => {
    await deployCommand();
  });

  program.command('queue:list').description('List queues').action(async () => {
    await queueListCommand();
  });

  program
    .command('queue:create')
    .description('Create a queue')
    .requiredOption('--name <name>', 'Queue name')
    .option('--delivery-delay-secs <seconds>', 'Default delivery delay in seconds', parseNumberOption)
    .option(
      '--message-retention-period-secs <seconds>',
      'Message retention period in seconds',
      parseNumberOption
    )
    .action(
      async (options: {
        name: string;
        deliveryDelaySecs?: number;
        messageRetentionPeriodSecs?: number;
      }) => {
        await queueCreateCommand(options.name, {
          deliveryDelaySecs: options.deliveryDelaySecs,
          messageRetentionPeriodSecs: options.messageRetentionPeriodSecs
        });
      }
    );
  program
    .command('queue:update')
    .description('Update a queue')
    .requiredOption('--name <name>', 'Queue name')
    .option('--delivery-delay-secs <seconds>', 'Default delivery delay in seconds', parseNumberOption)
    .option(
      '--message-retention-period-secs <seconds>',
      'Message retention period in seconds',
      parseNumberOption
    )
    .action(
      async (options: {
        name: string;
        deliveryDelaySecs?: number;
        messageRetentionPeriodSecs?: number;
      }) => {
        await queueUpdateCommand(options.name, {
          deliveryDelaySecs: options.deliveryDelaySecs,
          messageRetentionPeriodSecs: options.messageRetentionPeriodSecs
        });
      }
    );

  program
    .command('queue:delete')
    .description('Delete a queue')
    .requiredOption('--name <name>', 'Queue name')
    .action(async (options: { name: string }) => {
      await queueDeleteCommand(options.name);
    });

  program
    .command('queue:info')
    .description('Describe a queue')
    .requiredOption('--name <name>', 'Queue name')
    .action(async (options: { name: string }) => {
      await queueInfoCommand(options.name);
    });

  program
    .command('queue:pause')
    .description('Pause queue delivery')
    .requiredOption('--name <name>', 'Queue name')
    .action(async (options: { name: string }) => {
      await queuePauseCommand(options.name);
    });

  program
    .command('queue:resume')
    .description('Resume queue delivery')
    .requiredOption('--name <name>', 'Queue name')
    .action(async (options: { name: string }) => {
      await queueResumeCommand(options.name);
    });

  program
    .command('queue:purge')
    .description('Purge queue messages')
    .requiredOption('--name <name>', 'Queue name')
    .action(async (options: { name: string }) => {
      await queuePurgeCommand(options.name);
    });

  program
    .command('queue:consumer:http:add')
    .description('Add HTTP pull consumer for a queue')
    .requiredOption('--queue <queue>', 'Queue name')
    .option('--batch-size <size>', 'Batch size', parseNumberOption)
    .option('--message-retries <retries>', 'Message retries', parseNumberOption)
    .option('--dead-letter-queue <queue>', 'Dead letter queue name')
    .option('--visibility-timeout-secs <seconds>', 'Visibility timeout for pull consumer', parseNumberOption)
    .option('--retry-delay-secs <seconds>', 'Retry delay in seconds', parseNumberOption)
    .action(
      async (options: {
        queue: string;
        batchSize?: number;
        messageRetries?: number;
        deadLetterQueue?: string;
        visibilityTimeoutSecs?: number;
        retryDelaySecs?: number;
      }) => {
        await queueConsumerHttpAddCommand(options.queue, {
          batchSize: options.batchSize,
          messageRetries: options.messageRetries,
          deadLetterQueue: options.deadLetterQueue,
          visibilityTimeoutSecs: options.visibilityTimeoutSecs,
          retryDelaySecs: options.retryDelaySecs
        });
      }
    );
  program
    .command('queue:consumer:http:remove')
    .description('Remove HTTP pull consumer for a queue')
    .requiredOption('--queue <queue>', 'Queue name')
    .action(async (options: { queue: string }) => {
      await queueConsumerHttpRemoveCommand(options.queue);
    });

  program
    .command('queue:consumer:worker:add')
    .description('Add worker consumer for a queue')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--script <script>', 'Worker script name')
    .option('--batch-size <size>', 'Batch size', parseNumberOption)
    .option('--batch-timeout <seconds>', 'Batch timeout in seconds', parseNumberOption)
    .option('--message-retries <retries>', 'Message retries', parseNumberOption)
    .option('--dead-letter-queue <queue>', 'Dead letter queue name')
    .option('--max-concurrency <count>', 'Max consumer concurrency', parseNumberOption)
    .option('--retry-delay-secs <seconds>', 'Retry delay in seconds', parseNumberOption)
    .action(
      async (options: {
        queue: string;
        script: string;
        batchSize?: number;
        batchTimeout?: number;
        messageRetries?: number;
        deadLetterQueue?: string;
        maxConcurrency?: number;
        retryDelaySecs?: number;
      }) => {
        await queueConsumerWorkerAddCommand(
          options.queue,
          options.script,
          {
            batchSize: options.batchSize,
            batchTimeout: options.batchTimeout,
            messageRetries: options.messageRetries,
            deadLetterQueue: options.deadLetterQueue,
            maxConcurrency: options.maxConcurrency,
            retryDelaySecs: options.retryDelaySecs
          }
        );
      }
    );
  program
    .command('queue:consumer:worker:remove')
    .description('Remove worker consumer for a queue')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--script <script>', 'Worker script name')
    .action(async (options: { queue: string; script: string }) => {
      await queueConsumerWorkerRemoveCommand(options.queue, options.script);
    });
  program
    .command('subscription:list')
    .description('List queue subscriptions')
    .requiredOption('--queue <queue>', 'Queue name')
    .option('--page <page>', 'Page number', parseNumberOption)
    .option('--per-page <count>', 'Results per page', parseNumberOption)
    .option('--json', 'JSON output')
    .action(async (options: { queue: string; page?: number; perPage?: number; json?: boolean }) => {
      await subscriptionListCommand(
        options.queue,
        { page: options.page, perPage: options.perPage, json: options.json }
      );
    });

  program
    .command('subscription:create')
    .description('Create queue subscription')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--source <source>', 'Source id (same as queue name in most setups)')
    .requiredOption('--events <events>', 'Event list (for example "message.acked")')
    .option('--name <name>', 'Subscription name')
    .option('--enabled <enabled>', 'Subscription enabled state (true/false)', parseBooleanOption)
    .option('--model-name <modelName>', 'AI model name (for AI gateway subscriptions)')
    .option('--worker-name <workerName>', 'Worker destination name')
    .option('--workflow-name <workflowName>', 'Workflow destination name')
    .action(
      async (options: {
        queue: string;
        source: string;
        events: string;
        name?: string;
        enabled?: boolean;
        modelName?: string;
        workerName?: string;
        workflowName?: string;
      }) => {
        await subscriptionCreateCommand(options.queue, {
          source: options.source,
          events: options.events,
          name: options.name,
          enabled: options.enabled,
          modelName: options.modelName,
          workerName: options.workerName,
          workflowName: options.workflowName
        });
      }
    );
  program
    .command('subscription:get')
    .description('Get queue subscription')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--id <id>', 'Subscription ID')
    .option('--json', 'JSON output')
    .action(async (options: { queue: string; id: string; json?: boolean }) => {
      await subscriptionGetCommand(options.queue, options.id, { json: options.json });
    });

  program
    .command('subscription:update')
    .description('Update queue subscription destination')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--id <id>', 'Subscription ID')
    .option('--name <name>', 'Subscription name')
    .option('--events <events>', 'Event list')
    .option('--enabled <enabled>', 'Subscription enabled state (true/false)', parseBooleanOption)
    .option('--json', 'JSON output')
    .action(
      async (options: {
        queue: string;
        id: string;
        name?: string;
        events?: string;
        enabled?: boolean;
        json?: boolean;
      }) => {
        await subscriptionUpdateCommand(options.queue, options.id, {
          name: options.name,
          events: options.events,
          enabled: options.enabled,
          json: options.json
        });
      }
    );
  program
    .command('subscription:delete')
    .description('Delete queue subscription')
    .requiredOption('--queue <queue>', 'Queue name')
    .requiredOption('--id <id>', 'Subscription ID')
    .option('--force', 'Skip confirmation where supported')
    .action(async (options: { queue: string; id: string; force?: boolean }) => {
      await subscriptionDeleteCommand(options.queue, options.id, { force: options.force });
    });

  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    const cliError = toCliError(error);
    logger.cliError({
      code: cliError.code,
      summary: cliError.summary,
      file: cliError.file,
      details: cliError.details,
      hint: cliError.hint,
      docsUrl: cliError.docsUrl
    });
    process.exitCode = 1;
  }
}

function parseNumberOption(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CliError({
      code: 'INVALID_CLI_OPTION',
      summary: `Invalid numeric option: ${value}.`,
      details: 'Expected a non-negative integer.',
      hint: 'Use values like 0, 1, 30, 120.'
    });
  }
  return parsed;
}

function parseBooleanOption(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new CliError({
    code: 'INVALID_CLI_OPTION',
    summary: `Invalid boolean option: ${value}.`,
    details: 'Expected true or false.',
    hint: 'Use --enabled true or --enabled false.'
  });
}
