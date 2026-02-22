import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initCommand } from './init.js';
import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { runCommand } from '../process.js';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface CreateOptions {
  yes?: boolean;
  install?: boolean;
  force?: boolean;
  packageManager?: PackageManager;
}

interface InstallPlan {
  command: PackageManager;
  runtimeArgs: string[];
  devArgs: string[];
  devRunCommand: string;
}

const DEFAULT_PROJECT_DIR = 'better-cf-app';
const PACKAGE_MANAGERS: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun'];
const INSTALL_PLANS: Record<PackageManager, InstallPlan> = {
  npm: {
    command: 'npm',
    runtimeArgs: ['install', 'better-cf', 'zod'],
    devArgs: ['install', '-D', 'wrangler', '@cloudflare/workers-types', 'typescript'],
    devRunCommand: 'npm run dev'
  },
  pnpm: {
    command: 'pnpm',
    runtimeArgs: ['add', 'better-cf', 'zod'],
    devArgs: ['add', '-D', 'wrangler', '@cloudflare/workers-types', 'typescript'],
    devRunCommand: 'pnpm dev'
  },
  yarn: {
    command: 'yarn',
    runtimeArgs: ['add', 'better-cf', 'zod'],
    devArgs: ['add', '-D', 'wrangler', '@cloudflare/workers-types', 'typescript'],
    devRunCommand: 'yarn dev'
  },
  bun: {
    command: 'bun',
    runtimeArgs: ['add', 'better-cf', 'zod'],
    devArgs: ['add', '-d', 'wrangler', '@cloudflare/workers-types', 'typescript'],
    devRunCommand: 'bun run dev'
  }
};

export async function createCommand(
  projectDirectoryArg: string | undefined,
  options: CreateOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const isYes = options.yes ?? false;
  const shouldInstallByDefault = options.install ?? true;
  const isInteractive = Boolean(input.isTTY && output.isTTY && !isYes);

  const prompts = isInteractive ? createPrompts() : undefined;
  try {
    const projectDirectory = await resolveProjectDirectory(projectDirectoryArg, isYes, prompts);
    const targetDir = path.resolve(rootDir, projectDirectory);

    ensureTargetDirectory(targetDir, options.force ?? false);
    await initCommand(targetDir);

    const detectedPackageManager = detectPackageManager(rootDir);
    const packageManager =
      options.packageManager ??
      (prompts ? await prompts.selectPackageManager(detectedPackageManager) : detectedPackageManager);

    const shouldInstall =
      shouldInstallByDefault && (prompts ? await prompts.confirmInstall(true) : true);

    if (shouldInstall) {
      await installDependencies(packageManager, targetDir);
    }

    const relativePath = path.relative(rootDir, targetDir) || '.';
    const plan = INSTALL_PLANS[packageManager];

    logger.section('Project ready');
    logger.item('path', targetDir);
    if (relativePath !== '.') {
      logger.item('cd', `cd ${relativePath}`);
    }
    if (!shouldInstall) {
      logger.item('install', `${plan.command} ${plan.runtimeArgs.join(' ')}`);
      logger.item('install (dev)', `${plan.command} ${plan.devArgs.join(' ')}`);
    }
    logger.item('dev', plan.devRunCommand);
  } finally {
    prompts?.close();
  }
}

export function detectPackageManager(rootDir = process.cwd()): PackageManager {
  if (fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(rootDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(rootDir, 'bun.lock')) || fs.existsSync(path.join(rootDir, 'bun.lockb'))) {
    return 'bun';
  }

  const userAgent = process.env.npm_config_user_agent?.toLowerCase() ?? '';
  if (userAgent.startsWith('pnpm')) {
    return 'pnpm';
  }
  if (userAgent.startsWith('yarn')) {
    return 'yarn';
  }
  if (userAgent.startsWith('bun')) {
    return 'bun';
  }
  if (userAgent.startsWith('npm')) {
    return 'npm';
  }

  return 'npm';
}

function ensureTargetDirectory(targetDir: string, force: boolean): void {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    return;
  }

  const stats = fs.statSync(targetDir);
  if (!stats.isDirectory()) {
    throw new CliError({
      code: 'CREATE_TARGET_INVALID',
      summary: `Target path exists and is not a directory: ${targetDir}.`,
      hint: 'Choose a different project directory.'
    });
  }

  const contents = fs.readdirSync(targetDir).filter((entry) => entry !== '.DS_Store');
  if (contents.length > 0 && !force) {
    throw new CliError({
      code: 'CREATE_TARGET_NOT_EMPTY',
      summary: `Target directory is not empty: ${targetDir}.`,
      hint: 'Use --force to scaffold in a non-empty directory.'
    });
  }
}

async function resolveProjectDirectory(
  projectDirectoryArg: string | undefined,
  isYes: boolean,
  prompts: ReturnType<typeof createPrompts> | undefined
): Promise<string> {
  if (projectDirectoryArg && projectDirectoryArg.trim().length > 0) {
    return projectDirectoryArg.trim();
  }

  if (isYes) {
    return DEFAULT_PROJECT_DIR;
  }

  if (!prompts) {
    throw new CliError({
      code: 'CREATE_TARGET_REQUIRED',
      summary: 'Project directory is required in non-interactive mode.',
      hint: 'Pass a directory name, for example: `better-cf create my-worker`.'
    });
  }

  return prompts.askProjectDirectory(DEFAULT_PROJECT_DIR);
}

async function installDependencies(packageManager: PackageManager, targetDir: string): Promise<void> {
  const plan = INSTALL_PLANS[packageManager];
  logger.section(`Installing dependencies with ${plan.command}`);

  await runInstallCommand(plan.command, plan.runtimeArgs, targetDir);
  await runInstallCommand(plan.command, plan.devArgs, targetDir);
}

async function runInstallCommand(
  command: PackageManager,
  args: string[],
  cwd: string
): Promise<void> {
  try {
    const code = await runCommand(command, args, cwd, 'inherit');
    if (code !== 0) {
      throw new CliError({
        code: 'DEPENDENCY_INSTALL_FAILED',
        summary: `Dependency install failed: ${command} ${args.join(' ')}`,
        details: `Command exited with code ${code}.`,
        hint: `Run this command manually in ${cwd}.`
      });
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError({
      code: 'DEPENDENCY_INSTALL_FAILED',
      summary: `Dependency install failed: ${command} ${args.join(' ')}`,
      details: error instanceof Error ? error.message : String(error),
      hint: `Install dependencies manually in ${cwd}.`
    });
  }
}

function createPrompts() {
  const rl = createInterface({ input, output });

  return {
    async askProjectDirectory(defaultValue: string): Promise<string> {
      while (true) {
        const raw = await rl.question(`Project directory (${defaultValue}): `);
        const value = raw.trim() || defaultValue;
        if (value.length > 0) {
          return value;
        }
      }
    },

    async selectPackageManager(defaultValue: PackageManager): Promise<PackageManager> {
      const defaultIndex = PACKAGE_MANAGERS.indexOf(defaultValue);
      while (true) {
        output.write('\nSelect a package manager:\n');
        PACKAGE_MANAGERS.forEach((manager, index) => {
          output.write(`  ${index + 1}) ${manager}${manager === defaultValue ? ' (default)' : ''}\n`);
        });

        const raw = await rl.question(`Package manager [${defaultIndex + 1}]: `);
        const normalized = raw.trim().toLowerCase();
        if (!normalized) {
          return defaultValue;
        }

        if (PACKAGE_MANAGERS.includes(normalized as PackageManager)) {
          return normalized as PackageManager;
        }

        const asNumber = Number(normalized);
        if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= PACKAGE_MANAGERS.length) {
          return PACKAGE_MANAGERS[asNumber - 1];
        }

        logger.warn(`Unsupported package manager input: ${raw}`);
      }
    },

    async confirmInstall(defaultValue: boolean): Promise<boolean> {
      const hint = defaultValue ? 'Y/n' : 'y/N';
      while (true) {
        const raw = await rl.question(`Install dependencies now? (${hint}): `);
        const normalized = raw.trim().toLowerCase();

        if (!normalized) {
          return defaultValue;
        }
        if (normalized === 'y' || normalized === 'yes') {
          return true;
        }
        if (normalized === 'n' || normalized === 'no') {
          return false;
        }

        logger.warn(`Unsupported confirmation input: ${raw}`);
      }
    },

    close(): void {
      rl.close();
    }
  };
}
