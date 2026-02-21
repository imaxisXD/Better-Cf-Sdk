import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger.js';

export async function initCommand(rootDir = process.cwd()): Promise<void> {
  const configPath = path.join(rootDir, 'better-cf.config.ts');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, defaultConfigTemplate(), 'utf8');
    logger.success('Created better-cf.config.ts');
  }

  const workerPath = path.join(rootDir, 'worker.ts');
  const srcWorkerPath = path.join(rootDir, 'src', 'worker.ts');
  if (!fs.existsSync(workerPath) && !fs.existsSync(srcWorkerPath)) {
    fs.writeFileSync(workerPath, defaultWorkerTemplate(), 'utf8');
    logger.success('Created worker.ts');
  }

  const outputDir = path.join(rootDir, '.better-cf');
  fs.mkdirSync(outputDir, { recursive: true });

  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, '.better-cf/\nnode_modules/\n', 'utf8');
    logger.success('Created .gitignore');
  } else {
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    if (!existing.includes('.better-cf/')) {
      fs.appendFileSync(gitignorePath, '\n.better-cf/\n', 'utf8');
      logger.success('Updated .gitignore');
    }
  }

  const packageJsonPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts?: Record<string, string>;
    };
    packageJson.scripts = packageJson.scripts ?? {};
    packageJson.scripts.dev = packageJson.scripts.dev ?? 'better-cf dev';
    packageJson.scripts.deploy = packageJson.scripts.deploy ?? 'better-cf deploy';
    packageJson.scripts.generate = 'better-cf generate';

    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
    logger.success('Updated package.json scripts');
  }

  const wranglerTomlPath = path.join(rootDir, 'wrangler.toml');
  const wranglerJsoncPath = path.join(rootDir, 'wrangler.jsonc');
  const wranglerJsonPath = path.join(rootDir, 'wrangler.json');
  if (!fs.existsSync(wranglerTomlPath) && !fs.existsSync(wranglerJsoncPath) && !fs.existsSync(wranglerJsonPath)) {
    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(
      wranglerTomlPath,
      `name = "my-worker"\nmain = ".better-cf/entry.ts"\ncompatibility_date = "${date}"\n\n# --- better-cf:start ---\n# --- better-cf:end ---\n`,
      'utf8'
    );
    logger.success('Created wrangler.toml');
  }

  logger.info('Next steps: create a queue export and run `better-cf dev`.');
}

function defaultConfigTemplate(): string {
  return `import { createSDK } from 'better-cf/queue';

// Auto-inferred env types are generated under .better-cf/*.d.ts
// You can still switch to createSDK<Env>() when you need explicit overrides.
export const { defineQueue, defineWorker } = createSDK();

export const betterCfConfig = {
  // workerEntry: 'worker.ts',
  // ignore: ['coverage'],
  legacyServiceWorker: false,
  inferEnvTypes: true,
};
`;
}

function defaultWorkerTemplate(): string {
  return `import { defineWorker } from './better-cf.config';

export default defineWorker({
  async fetch() {
    return new Response('better-cf ready');
  },
});
`;
}
