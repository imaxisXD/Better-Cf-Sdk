import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('wrangler config patching', () => {
  it('patches toml markers and preserves unrelated blocks', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/toml-wrangler-config');
    const temp = makeTempDir('better-cf-toml-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(wrangler).toContain('[vars]');
    expect(wrangler).toContain('ENV = "dev"');
    expect(wrangler).toContain('[[queues.producers]]');
    expect(wrangler).toContain('binding = "QUEUE_TOML"');
    expect(wrangler).toContain('main = ".better-cf/entry.ts"');
  });

  it('patches jsonc queues without dropping unrelated values', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/jsonc-wrangler-config');
    const temp = makeTempDir('better-cf-jsonc-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(wrangler).toContain('"vars"');
    expect(wrangler).toContain('"ENV": "dev"');
    expect(wrangler).toContain('"queues"');
    expect(wrangler).toContain('"QUEUE_JSONC"');
    expect(wrangler).toContain('"main": ".better-cf/entry.ts"');
  });

  it('maps http_pull consumer visibility timeout in toml output', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/pull-consumer');
    const temp = makeTempDir('better-cf-pull-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(wrangler).toContain('type = "http_pull"');
    expect(wrangler).toContain('visibility_timeout_ms = 30000');
    expect(wrangler).toContain('max_retries = 4');
    expect(wrangler).toContain('dead_letter_queue = "pull-dlq"');
  });

  it('maps producer delivery_delay in toml output', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/delivery-delay');
    const temp = makeTempDir('better-cf-delivery-delay-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(wrangler).toContain('delivery_delay = 45');
    expect(wrangler).toContain('retry_delay = 10');
  });

  it('fails on invalid duration literals instead of coercing to zero', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-invalid-duration-');
    copyDir(fixture, temp);

    fs.writeFileSync(
      path.join(temp, 'src/queues/signup.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email(), userId: z.string() }),
  process: async () => {},
  retryDelay: 'soon'
});
`,
      'utf8'
    );

    await expect(runGenerate(temp)).rejects.toThrow('Invalid duration string');
  });

  it('escapes toml string values emitted from queue config', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-toml-escape-');
    copyDir(fixture, temp);

    fs.writeFileSync(
      path.join(temp, 'src/queues/signup.ts'),
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const signupQueue = defineQueue({
  message: z.object({ email: z.string().email(), userId: z.string() }),
  process: async () => {},
  deadLetter: 'dlq-"quoted"-\\\\path'
});
`,
      'utf8'
    );

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(wrangler).toContain('dead_letter_queue = "dlq-\\"quoted\\"-\\\\\\\\path"');
  });
});
