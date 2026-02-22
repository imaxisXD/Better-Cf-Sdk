import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCommand } from '../../src/cli/commands/create.js';
import { detectPackageManager } from '../../src/cli/commands/create.js';
import { initCommand } from '../../src/cli/commands/init.js';
import { devCommand } from '../../src/cli/commands/dev.js';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { loadCliConfig } from '../../src/cli/config.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

describe('cli commands', () => {
  it('init scaffolds expected files and package scripts', async () => {
    const temp = makeTempDir('better-cf-init-');
    fs.writeFileSync(
      path.join(temp, 'package.json'),
      JSON.stringify({ name: 'app', version: '1.0.0', scripts: {} }, null, 2),
      'utf8'
    );

    await initCommand(temp);

    expect(fs.existsSync(path.join(temp, 'better-cf.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(temp, 'worker.ts'))).toBe(true);
    expect(fs.existsSync(path.join(temp, 'wrangler.toml'))).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(path.join(temp, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.dev).toBe('better-cf dev');
    expect(pkg.scripts.deploy).toBe('better-cf deploy');
    expect(pkg.scripts.generate).toBe('better-cf generate');

    const gitignore = fs.readFileSync(path.join(temp, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.better-cf/');
  });

  it('init creates package.json when missing', async () => {
    const temp = makeTempDir('better-cf-init-missing-');

    await initCommand(temp);

    const pkgPath = path.join(temp, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      name?: string;
      version?: string;
      private?: boolean;
      scripts?: Record<string, string>;
    };

    expect(pkg.name).toBeTruthy();
    expect(pkg.version).toBe('0.0.0');
    expect(pkg.private).toBe(true);
    expect(pkg.scripts?.dev).toBe('better-cf dev');
    expect(pkg.scripts?.deploy).toBe('better-cf deploy');
    expect(pkg.scripts?.generate).toBe('better-cf generate');
  });

  it('dev command rejects remote mode for queues', async () => {
    const fixture = path.join(process.cwd(), 'fixtures/e2e/basic-worker');
    const temp = makeTempDir('better-cf-dev-');
    copyDir(fixture, temp);

    await expect(
      devCommand({
        port: '8787',
        watch: false,
        remote: true
      }, temp)
    ).rejects.toThrow('do not support wrangler dev --remote');
  });

  it('loads betterCfConfig overrides from config file', () => {
    const temp = makeTempDir('better-cf-config-');

    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `export const betterCfConfig = {
  workerEntry: 'src/main-worker.ts',
  legacyServiceWorker: true,
  inferEnvTypes: false,
  ignore: ['coverage', '.cache']
};
`,
      'utf8'
    );

    const loaded = loadCliConfig(temp);

    expect(loaded.workerEntry).toBe('src/main-worker.ts');
    expect(loaded.legacyServiceWorker).toBe(true);
    expect(loaded.inferEnvTypes).toBe(false);
    expect(loaded.ignore).toEqual(expect.arrayContaining(['coverage', '.cache', '.better-cf']));
  });

  it('generate succeeds when no queues are discovered', async () => {
    const temp = makeTempDir('better-cf-no-queues-');
    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `import { createSDK } from 'better-cf/queue';
type Env = {};
export const { defineWorker } = createSDK<Env>();
`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(temp, 'worker.ts'),
      `export default { fetch: async () => new Response('ok') };`,
      'utf8'
    );
    fs.writeFileSync(
      path.join(temp, 'wrangler.toml'),
      `name = \"no-queues\"\nmain = \"worker.ts\"\ncompatibility_date = \"2025-01-01\"\n`,
      'utf8'
    );

    const result = await runGenerate(temp);

    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');
    expect(result.discovery.queues).toHaveLength(0);
    expect(entry).toContain('const __queues');
  });

  it('create scaffolds a project', async () => {
    const root = makeTempDir('better-cf-create-');
    await createCommand(
      'my-worker',
      {
        yes: true,
        install: false,
        packageManager: 'pnpm'
      },
      root
    );

    const projectDir = path.join(root, 'my-worker');
    expect(fs.existsSync(path.join(projectDir, 'better-cf.config.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'package.json'))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.dev).toBe('better-cf dev');
  });

  it('create rejects non-empty target directories without --force', async () => {
    const root = makeTempDir('better-cf-create-non-empty-');
    const target = path.join(root, 'my-worker');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'README.md'), '# existing\n', 'utf8');

    await expect(
      createCommand(
        'my-worker',
        {
          yes: true,
          install: false,
          packageManager: 'npm'
        },
        root
      )
    ).rejects.toMatchObject({
      code: 'CREATE_TARGET_NOT_EMPTY'
    });
  });

  it('detects package manager from lockfiles', () => {
    const root = makeTempDir('better-cf-pm-detect-');
    expect(detectPackageManager(root)).toBe('npm');

    fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9', 'utf8');
    expect(detectPackageManager(root)).toBe('pnpm');
    fs.rmSync(path.join(root, 'pnpm-lock.yaml'));

    fs.writeFileSync(path.join(root, 'yarn.lock'), '', 'utf8');
    expect(detectPackageManager(root)).toBe('yarn');
    fs.rmSync(path.join(root, 'yarn.lock'));

    fs.writeFileSync(path.join(root, 'bun.lock'), '', 'utf8');
    expect(detectPackageManager(root)).toBe('bun');
  });
});
