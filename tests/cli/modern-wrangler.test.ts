import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('modern wrangler patching', () => {
  it('patches jsonc configs for the durable-object surface', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-jsonc-');
    copyDir(fixture, temp);

    fs.unlinkSync(path.join(temp, 'wrangler.toml'));
    fs.writeFileSync(
      path.join(temp, 'wrangler.jsonc'),
      `{
  "name": "nextgen-room",
  "main": "worker.ts",
  "compatibility_date": "2025-01-01",
  "vars": {
    "ENV": "dev"
  }
}
`,
      'utf8'
    );

    const result = await runGenerate(temp);
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');

    expect(result.wranglerConfigPath.endsWith('wrangler.jsonc')).toBe(true);
    expect(wrangler).toContain('"main": ".better-cf/entry.ts"');
    expect(wrangler).toContain('"durable_objects"');
    expect(wrangler).toContain('"DO_ROOM"');
    expect(wrangler).toContain('"migrations"');
    expect(wrangler).toContain('"new_sqlite_classes"');
    expect(wrangler).toContain('"vars"');
    expect(wrangler).toContain('"ENV": "dev"');
  });

  it('accumulates sqlite migrations when a new durable object is added later', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-migrations-');
    copyDir(fixture, temp);

    await runGenerate(temp);

    fs.appendFileSync(
      path.join(temp, 'src/schema.ts'),
      `

export const session = sdk.defineDurableObject({
  name: 'Session',
  key: z.string(),
  version: 1,
  description: 'Session state.'
});
`,
      'utf8'
    );

    const second = await runGenerate(temp);
    const wrangler = fs.readFileSync(second.wranglerConfigPath, 'utf8');
    const state = JSON.parse(fs.readFileSync(path.join(temp, '.better-cf/durable-migrations.json'), 'utf8'));

    expect(wrangler).toContain('class_name = "Room"');
    expect(wrangler).toContain('class_name = "Session"');
    expect(wrangler).toContain('tag = "better-cf-v1"');
    expect(wrangler).toContain('tag = "better-cf-v2"');
    expect(wrangler).toContain('new_sqlite_classes = ["Room"]');
    expect(wrangler).toContain('new_sqlite_classes = ["Session"]');

    expect(state).toMatchObject({
      version: 2,
      knownClasses: ['Room', 'Session'],
      migrations: [
        { tag: 'better-cf-v1', newSqliteClasses: ['Room'] },
        { tag: 'better-cf-v2', newSqliteClasses: ['Session'] }
      ]
    });
  });
});
