import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { loadCliConfig } from '../../src/cli/config.js';
import { scanQueues } from '../../src/cli/discovery/scanner.js';
import { createProjectWatcher } from '../../src/cli/watcher.js';
import { createSDK } from '../../src/queue/index.js';
import { testQueue } from '../../src/testing/index.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('better-cf e2e behavior', () => {
  it('generates stable artifacts and wrangler mapping for basic queue', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-e2e-basic-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);

    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');
    const autoEnv = fs.readFileSync(result.autoEnvPath, 'utf8');

    expect(entry).toContain('resolveWorkerHandlers');
    expect(entry).toContain("'signup': signupQueue");
    expect(wrangler).toContain('max_retries = 3');
    expect(wrangler).toContain('dead_letter_queue = "dead-signups"');
    expect(autoEnv).toContain('interface BetterCfAutoEnv extends BetterCfGeneratedBindings');
  });

  it('supports queue send/consume flow via testing runtime', async () => {
    const { defineQueue } = createSDK<Record<string, never>>();

    const processed: Array<{ id: string }> = [];
    const queue = defineQueue({
      message: z.object({ id: z.string() }),
      process: async (_ctx, message) => {
        processed.push(message);
      }
    });

    const result = await testQueue(queue, {
      env: {},
      message: { id: 'abc' }
    });

    expect(processed).toEqual([{ id: 'abc' }]);
    expect(result.acked).toHaveLength(1);
    expect(result.retried).toHaveLength(0);
  });

  it('handles batch explicit retryAll and fallback ackAll semantics', async () => {
    const { defineQueue } = createSDK<Record<string, never>>();

    const fallbackQueue = defineQueue({
      message: z.object({ id: z.string() }),
      processBatch: async () => {
        return;
      }
    });

    const fallbackResult = await testQueue(fallbackQueue, {
      env: {},
      messages: [{ id: '1' }, { id: '2' }]
    });

    expect(fallbackResult.acked).toHaveLength(2);

    const explicitQueue = defineQueue({
      message: z.object({ id: z.string() }),
      processBatch: async (ctx) => {
        ctx.batch.retryAll();
      }
    });

    const explicitResult = await testQueue(explicitQueue, {
      env: {},
      messages: [{ id: '1' }, { id: '2' }]
    });

    expect(explicitResult.retried).toHaveLength(2);
    expect(explicitResult.acked).toHaveLength(0);
  });

  it('routes multi-job envelopes and acks unknown jobs', async () => {
    const { defineQueue } = createSDK<Record<string, never>>();

    const queue = defineQueue({
      signup: {
        message: z.object({ email: z.string() }),
        process: async () => {
          return;
        }
      },
      retry: 1
    });

    const valid = await testQueue(queue, {
      env: {},
      message: { _job: 'signup', data: { email: 'valid@example.com' } } as never
    });
    expect(valid.acked).toHaveLength(1);

    const unknown = await testQueue(queue, {
      env: {},
      message: { _job: 'unknown', data: { email: 'x' } } as never
    });
    expect(unknown.acked).toHaveLength(1);
    expect(unknown.retried).toHaveLength(0);
  });

  it('keeps Hono fixture compatible with generated entry strategy', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/hono-worker');
    const temp = makeTempDir('better-cf-e2e-hono-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');

    expect(entry).toContain('resolveWorkerHandlers');
    expect(entry).toContain('workerDefault, * as workerModule');
  });

  it('writes legacy compatibility warning for service-worker adapter mode', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/service-worker-legacy-adapter');
    const temp = makeTempDir('better-cf-e2e-legacy-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');

    expect(entry).toContain('legacyServiceWorker mode is compatibility-only');
  });

  it('re-discovers queue edits (watch-mode prerequisite behavior)', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-e2e-watch-');
    copyDir(fixture, temp);

    await runGenerate(temp);

    let callbackCount = 0;
    const watcher = createProjectWatcher(temp, {
      ignored: ['node_modules', '.better-cf', 'dist'],
      onRelevantChange: async () => {
        callbackCount += 1;
      }
    });

    await new Promise((resolve) => watcher.once('ready', resolve));
    fs.appendFileSync(path.join(temp, 'src/queues/signup.ts'), '\n// watch-change\n', 'utf8');

    await new Promise((resolve) => setTimeout(resolve, 1200));
    await watcher.close();

    expect(callbackCount).toBeGreaterThan(0);
  });

  it('fails generate when queue names conflict', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-e2e-conflict-');
    copyDir(fixture, temp);

    fs.writeFileSync(
      path.join(temp, 'src/queues/duplicate.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ id: z.string() }),
  process: async () => {}
});
`,
      'utf8'
    );

    await expect(runGenerate(temp)).rejects.toThrow('Queue discovery failed');
  });

  it('fails generate for invalid process/processBatch combo', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-e2e-invalid-');
    copyDir(fixture, temp);

    fs.writeFileSync(
      path.join(temp, 'src/queues/signup.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ email: z.string() }),
  process: async () => {},
  processBatch: async () => {}
});
`,
      'utf8'
    );

    await expect(runGenerate(temp)).rejects.toThrow('Queue discovery failed');
  });

  it('detects no scan errors across declared fixture set', async () => {
    const fixtureNames = [
      'basic-worker',
      'hono-worker',
      'multi-queue',
      'multi-job',
      'batch-processing',
      'service-worker-legacy-adapter',
      'jsonc-wrangler-config',
      'toml-wrangler-config',
      'pull-consumer',
      'delivery-delay'
    ];

    for (const fixtureName of fixtureNames) {
      const source = path.join(repoRoot, 'fixtures/e2e', fixtureName);
      const temp = makeTempDir(`better-cf-e2e-${fixtureName}-`);
      copyDir(source, temp);

      const scan = await scanQueues(loadCliConfig(temp));
      const errors = scan.diagnostics.filter((diag) => diag.level === 'error');
      expect(errors, fixtureName).toHaveLength(0);
    }
  });
});
