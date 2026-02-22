import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { runCommand } from '../process.js';
import { runGenerate } from './generate.js';

export async function deployCommand(rootDir = process.cwd()): Promise<void> {
  const result = await runGenerate(rootDir);

  logger.section('Deploying with wrangler');
  const code = await runCommand('npx', ['wrangler', 'deploy'], rootDir, 'inherit');
  if (code !== 0) {
    throw new CliError({
      code: 'WRANGLER_DEPLOY_FAILED',
      summary: 'wrangler deploy failed.',
      details: `wrangler exited with code ${code}`,
      hint: 'Run wrangler deploy manually to inspect environment-specific failures.'
    });
  }

  logger.success('Deployment complete');
  logger.section('Active queue bindings');
  for (const queue of result.discovery.queues) {
    logger.item(queue.queueName, queue.bindingName);
  }
}
