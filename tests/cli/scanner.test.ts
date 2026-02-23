import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCliConfig } from '../../src/cli/config.js';
import { scanQueues } from '../../src/cli/discovery/scanner.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('queue scanner', () => {
  it('discovers queues from better-cf.config imports', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-scan-');
    copyDir(fixture, temp);

    const config = loadCliConfig(temp);
    const result = await scanQueues(config);

    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].queueName).toBe('signup');
    expect(result.queues[0].bindingName).toBe('QUEUE_SIGNUP');
    expect(result.diagnostics.some((diag) => diag.level === 'error')).toBe(false);
  });

  it('reports queue name conflicts', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-conflict-');
    copyDir(fixture, temp);

    fs.mkdirSync(path.join(temp, 'src/queues', 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(temp, 'src/queues/nested/signup.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../../better-cf.config';

export const signupQueue = defineQueue({
  args: z.object({ id: z.string() }),
  handler: async () => {}
});
`,
      'utf8'
    );

    const result = await scanQueues(loadCliConfig(temp));
    const conflict = result.diagnostics.find((diag) => diag.code === 'QUEUE_NAME_CONFLICT');
    expect(conflict).toBeDefined();
  });

  it('supports aliased defineQueue imports and default export via identifier', async () => {
    const temp = makeTempDir('better-cf-alias-');
    fs.mkdirSync(path.join(temp, 'src/queues'), { recursive: true });

    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `import { createSDK } from 'better-cf/queue';
export type Env = {};
export const { defineQueue } = createSDK<Env>();
`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(temp, 'src/queues/default-email.ts'),
      `import { z } from 'zod';
import { defineQueue as dq } from '../../better-cf.config';

const queueDef = dq({
  args: z.object({ email: z.string() }),
  handler: async () => {}
});

export default queueDef;
`,
      'utf8'
    );

    const result = await scanQueues(loadCliConfig(temp));

    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].isDefaultExport).toBe(true);
    expect(result.queues[0].queueName).toBe('default-email');
  });

  it('discovers queues declared with defineQueues imports', async () => {
    const temp = makeTempDir('better-cf-define-queues-');
    fs.mkdirSync(path.join(temp, 'src/queues'), { recursive: true });

    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `import { createSDK } from 'better-cf/queue';
export const { defineQueues } = createSDK();
`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(temp, 'src/queues/jobs.ts'),
      `import { z } from 'zod';
import { defineQueues as dqs } from '../../better-cf.config';

export const jobsQueue = dqs({
  signup: {
    args: z.object({ email: z.string() }),
    handler: async () => {}
  },
  retry: 3
});
`,
      'utf8'
    );

    const result = await scanQueues(loadCliConfig(temp));

    expect(result.queues).toHaveLength(1);
    expect(result.queues[0].queueName).toBe('jobs');
    expect(result.queues[0].bindingName).toBe('QUEUE_JOBS');
    expect(result.diagnostics.some((diag) => diag.level === 'error')).toBe(false);
  });

  it('reports invalid pull-mode handler combinations', async () => {
    const temp = makeTempDir('better-cf-pull-invalid-');
    fs.mkdirSync(path.join(temp, 'src/queues'), { recursive: true });

    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `import { createSDK } from 'better-cf/queue';
export const { defineQueue } = createSDK();
`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(temp, 'src/queues/pull.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const pullQueue = defineQueue({
  args: z.object({ id: z.string() }),
  consumer: { type: 'http_pull' },
  handler: async () => {}
});
`,
      'utf8'
    );

    const result = await scanQueues(loadCliConfig(temp));
    const issue = result.diagnostics.find((diag) => diag.code === 'INVALID_PULL_MODE_HANDLER');
    expect(issue).toBeDefined();
  });
});
