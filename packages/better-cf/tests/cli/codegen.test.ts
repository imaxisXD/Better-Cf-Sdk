import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('code generation', () => {
  it('generates entry and type augmentation files', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/multi-queue');
    const temp = makeTempDir('better-cf-codegen-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);

    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');
    const types = fs.readFileSync(result.generatedTypesPath, 'utf8');

    expect(entry).toContain('getQueueInternals');
    expect(entry).toContain("'email'");
    expect(entry).toContain("'audit'");
    expect(types).toContain('declare module \'better-cf/queue\'');
    expect(types).toContain('QUEUE_EMAIL');
    expect(types).toContain('QUEUE_AUDIT');
  });

  it('is idempotent on repeated generate', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-idempotent-');
    copyDir(fixture, temp);

    const first = await runGenerate(temp);
    const firstEntry = fs.readFileSync(first.generatedEntryPath, 'utf8');
    const firstWrangler = fs.readFileSync(first.wranglerConfigPath, 'utf8');

    const second = await runGenerate(temp);
    const secondEntry = fs.readFileSync(second.generatedEntryPath, 'utf8');
    const secondWrangler = fs.readFileSync(second.wranglerConfigPath, 'utf8');

    expect(secondEntry).toBe(firstEntry);
    expect(secondWrangler).toBe(firstWrangler);
  });

  it('escapes generated import paths safely', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-escaped-import-');
    copyDir(fixture, temp);

    const queuePath = path.join(temp, "src/queues/o'hare.ts");
    fs.writeFileSync(
      queuePath,
      `import { z } from 'zod';
import { defineQueue } from '../../better-cf.config';

export const ohareQueue = defineQueue({
  message: z.object({ id: z.string() }),
  process: async () => {}
});
`,
      'utf8'
    );

    const result = await runGenerate(temp);
    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');

    expect(entry).toContain(`from "../src/queues/o'hare"`);
  });
});
