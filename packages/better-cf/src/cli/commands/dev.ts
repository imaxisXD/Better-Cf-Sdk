import type { ChildProcess } from 'node:child_process';
import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { spawnCommand } from '../process.js';
import { createProjectWatcher } from '../watcher.js';
import { runGenerate } from './generate.js';

export interface DevOptions {
  port: string;
  watch: boolean;
  remote: boolean;
}

export async function devCommand(options: DevOptions, rootDir = process.cwd()): Promise<void> {
  if (options.remote) {
    throw new CliError({
      code: 'REMOTE_QUEUE_DEV_UNSUPPORTED',
      summary: 'Cloudflare Queues do not support wrangler dev --remote.',
      hint: 'Run better-cf dev without --remote for queue consumer development.',
      docsUrl: 'https://developers.cloudflare.com/queues/configuration/local-development/'
    });
  }

  let wranglerProcess: ChildProcess | null = null;
  let isRebuilding = false;

  const buildAndRestart = async (reason: string): Promise<void> => {
    if (isRebuilding) {
      return;
    }

    isRebuilding = true;
    try {
      const result = await runGenerate(rootDir);
      logger.success(`Regenerated project (${reason}) with ${result.discovery.queues.length} queue(s)`);

      if (wranglerProcess) {
        wranglerProcess.kill();
      }

      wranglerProcess = spawnCommand('npx', ['wrangler', 'dev', '--port', options.port], rootDir);
      wranglerProcess.once('error', (error) => {
        logger.error(`Failed to start wrangler dev: ${error.message}`);
      });
    } finally {
      isRebuilding = false;
    }
  };

  await buildAndRestart('initial build');

  if (options.watch) {
    const watcher = createProjectWatcher(rootDir, {
      ignored: ['node_modules', '.better-cf', 'dist'],
      onRelevantChange: async (filePath) => {
        await buildAndRestart(`file changed: ${filePath}`);
      }
    });

    process.on('SIGINT', async () => {
      await watcher.close();
      wranglerProcess?.kill();
      process.exit(0);
    });
  } else {
    process.on('SIGINT', () => {
      wranglerProcess?.kill();
      process.exit(0);
    });
  }
}
