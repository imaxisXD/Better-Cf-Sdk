import fs from 'node:fs/promises';
import path from 'node:path';
import {
  confirm,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text
} from '@clack/prompts';
import { resolveCommand } from 'package-manager-detector/commands';
import { detectSync, getUserAgent } from 'package-manager-detector/detect';
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
const RUNTIME_DEPENDENCIES = ['better-cf', 'zod'];
const DEV_DEPENDENCIES = ['wrangler', '@cloudflare/workers-types', 'typescript'];

export async function createCommand(
  projectDirectoryArg: string | undefined,
  options: CreateOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const isYes = options.yes ?? false;
  const shouldInstallByDefault = options.install ?? true;
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !isYes);

  if (isInteractive) {
    intro('Create a better-cf project');
  }

  const projectDirectory = await resolveProjectDirectory(projectDirectoryArg, isYes, isInteractive);
  const targetDir = path.resolve(rootDir, projectDirectory);

  await ensureTargetDirectory(targetDir, options.force ?? false);
  await initCommand(targetDir);

  const detectedPackageManager = detectPackageManager(rootDir);
  const packageManager =
    options.packageManager ??
    (isInteractive ? await promptPackageManager(detectedPackageManager) : detectedPackageManager);

  const shouldInstall =
    shouldInstallByDefault && (isInteractive ? await promptInstallConfirmation(true) : true);

  if (shouldInstall) {
    await installDependencies(packageManager, targetDir, isInteractive);
  }

  const relativePath = path.relative(rootDir, targetDir) || '.';
  const plan = getInstallPlan(packageManager);

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

  if (isInteractive) {
    outro('Project scaffold complete.');
  }
}

export function detectPackageManager(rootDir = process.cwd()): PackageManager {
  try {
    const detected = detectSync({ cwd: rootDir });
    if (detected && isSupportedPackageManager(detected.name)) {
      return detected.name;
    }
  } catch {
    // Fallback to user agent or npm below.
  }

  const userAgent = getUserAgent();
  if (userAgent && isSupportedPackageManager(userAgent)) {
    return userAgent;
  }

  return 'npm';
}

async function resolveProjectDirectory(
  projectDirectoryArg: string | undefined,
  isYes: boolean,
  isInteractive: boolean
): Promise<string> {
  if (projectDirectoryArg && projectDirectoryArg.trim().length > 0) {
    return projectDirectoryArg.trim();
  }

  if (isYes) {
    return DEFAULT_PROJECT_DIR;
  }

  if (!isInteractive) {
    throw new CliError({
      code: 'CREATE_TARGET_REQUIRED',
      summary: 'Project directory is required in non-interactive mode.',
      hint: 'Pass a directory name, for example: `better-cf create my-worker`.'
    });
  }

  const value = await text({
    message: 'Project directory',
    defaultValue: DEFAULT_PROJECT_DIR,
    placeholder: DEFAULT_PROJECT_DIR,
    validate(input) {
      if (input.trim().length === 0) {
        return 'Project directory cannot be empty.';
      }
      return undefined;
    }
  });

  if (isCancel(value)) {
    throw cancellationError();
  }

  return value.trim() || DEFAULT_PROJECT_DIR;
}

async function promptPackageManager(defaultValue: PackageManager): Promise<PackageManager> {
  const response = await select<PackageManager>({
    message: 'Select a package manager',
    initialValue: defaultValue,
    options: PACKAGE_MANAGERS.map((manager) => ({
      value: manager,
      label: manager,
      hint: manager === defaultValue ? 'detected' : undefined
    }))
  });

  if (isCancel(response)) {
    throw cancellationError();
  }

  return response;
}

async function promptInstallConfirmation(defaultValue: boolean): Promise<boolean> {
  const response = await confirm({
    message: 'Install dependencies now?',
    initialValue: defaultValue
  });

  if (isCancel(response)) {
    throw cancellationError();
  }

  return response;
}

async function ensureTargetDirectory(targetDir: string, force: boolean): Promise<void> {
  try {
    const stats = await fs.stat(targetDir);
    if (!stats.isDirectory()) {
      throw new CliError({
        code: 'CREATE_TARGET_INVALID',
        summary: `Target path exists and is not a directory: ${targetDir}.`,
        hint: 'Choose a different project directory.'
      });
    }

    const contents = (await fs.readdir(targetDir)).filter((entry) => entry !== '.DS_Store');
    if (contents.length > 0 && !force) {
      throw new CliError({
        code: 'CREATE_TARGET_NOT_EMPTY',
        summary: `Target directory is not empty: ${targetDir}.`,
        hint: 'Use --force to scaffold in a non-empty directory.'
      });
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      await fs.mkdir(targetDir, { recursive: true });
      return;
    }

    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError({
      code: 'CREATE_TARGET_INVALID',
      summary: `Failed to prepare target directory: ${targetDir}.`,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function installDependencies(
  packageManager: PackageManager,
  targetDir: string,
  isInteractive: boolean
): Promise<void> {
  const plan = getInstallPlan(packageManager);
  logger.section(`Installing dependencies with ${plan.command}`);

  const installSpinner = isInteractive ? spinner() : undefined;

  installSpinner?.start('Installing runtime dependencies');
  await runInstallCommand(plan.command, plan.runtimeArgs, targetDir);
  installSpinner?.stop('Installed runtime dependencies');

  installSpinner?.start('Installing dev dependencies');
  await runInstallCommand(plan.command, plan.devArgs, targetDir);
  installSpinner?.stop('Installed dev dependencies');
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

function getInstallPlan(packageManager: PackageManager): InstallPlan {
  const addCommand = resolveCommand(packageManager, 'add', []);
  const runCommandPlan = resolveCommand(packageManager, 'run', ['dev']);

  if (!addCommand || !runCommandPlan) {
    throw new CliError({
      code: 'PACKAGE_MANAGER_UNSUPPORTED',
      summary: `Package manager is not supported: ${packageManager}.`,
      hint: 'Use one of npm, pnpm, yarn, or bun.'
    });
  }

  const devFlag = packageManager === 'bun' ? '-d' : '-D';

  return {
    command: packageManager,
    runtimeArgs: [...addCommand.args, ...RUNTIME_DEPENDENCIES],
    devArgs: [...addCommand.args, devFlag, ...DEV_DEPENDENCIES],
    devRunCommand: `${runCommandPlan.command} ${runCommandPlan.args.join(' ')}`
  };
}

function isSupportedPackageManager(value: string): value is PackageManager {
  return value === 'npm' || value === 'pnpm' || value === 'yarn' || value === 'bun';
}

function cancellationError(): CliError {
  return new CliError({
    code: 'USER_CANCELLED',
    summary: 'Create command was cancelled by user.',
    hint: 'Re-run `better-cf create` to start again.'
  });
}
