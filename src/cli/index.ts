import { Command } from 'commander';
import { renderBanner, shouldRenderBanner } from './banner.js';
import { createCommand, type PackageManager } from './commands/create.js';
import { deployCommand } from './commands/deploy.js';
import { devCommand } from './commands/dev.js';
import { generateCommand } from './commands/generate.js';
import { initCommand } from './commands/init.js';
import {
  registryAddCommand,
  registryCacheClearCommand,
  registryInfoCommand,
  registryListCommand
} from './commands/registry.js';
import { treeCommand } from './commands/tree.js';
import { CliError, toCliError } from './errors.js';
import { logger } from './logger.js';

export async function run(argv = process.argv.slice(2)): Promise<void> {
  if (shouldRenderBanner(argv)) {
    renderBanner();
  }

  const program = new Command();

  program.name('better-cf').description('better-cf queue SDK CLI').version('0.2.2');
  program.exitOverride();

  program
    .command('create [project-directory]')
    .description('Create a new better-cf project')
    .option('-y, --yes', 'Use defaults and skip prompts')
    .option('--no-install', 'Skip dependency installation')
    .option('--force', 'Allow creating in a non-empty directory')
    .option(
      '--package-manager <manager>',
      'Select package manager (npm, pnpm, yarn, bun)',
      parsePackageManagerOption
    )
    .action(
      async (
        projectDirectory: string | undefined,
        options: {
          yes: boolean;
          install: boolean;
          force: boolean;
          packageManager?: PackageManager;
        }
      ) => {
        await createCommand(projectDirectory, {
          yes: options.yes,
          install: options.install,
          force: options.force,
          packageManager: options.packageManager
        });
      }
    );

  program.command('init').description('Initialize better-cf in the current project').action(async () => {
    await initCommand();
  });

  program.command('generate').description('Scan queues and regenerate .better-cf files').action(async () => {
    await generateCommand();
  });

  program
    .command('dev')
    .description('Run local development with queue codegen and wrangler dev')
    .option('-p, --port <port>', 'Port to pass to wrangler dev', '8787')
    .option('--no-watch', 'Disable file watcher')
    .option('--remote', 'Pass through remote mode (blocked for queues)')
    .action(async (options: { port: string; watch: boolean; remote: boolean }) => {
      await devCommand(options);
    });

  program.command('deploy').description('Generate and deploy via wrangler deploy').action(async () => {
    await deployCommand();
  });

  const registryCommand = program.command('registry').description('Manage better-cf template registry entries');

  registryCommand
    .command('list')
    .description('List available registry entries')
    .option('--refresh', 'Bypass cache and refresh from remote registry')
    .action(async (options: { refresh?: boolean }) => {
      await registryListCommand({ refresh: options.refresh });
    });

  registryCommand
    .command('info <id>')
    .description('Show details for a registry entry')
    .option('--refresh', 'Bypass cache and refresh from remote registry')
    .action(async (id: string, options: { refresh?: boolean }) => {
      await registryInfoCommand(id, { refresh: options.refresh });
    });

  registryCommand
    .command('add <id> [target]')
    .description('Install registry entry files into target directory')
    .option('--refresh', 'Bypass cache and refresh from remote registry')
    .action(async (id: string, target: string | undefined, options: { refresh?: boolean }) => {
      await registryAddCommand(id, target, { refresh: options.refresh });
    });

  registryCommand
    .command('cache')
    .description('Manage local registry cache')
    .command('clear')
    .description('Clear local registry cache data')
    .action(async () => {
      await registryCacheClearCommand();
    });

  program
    .command('tree [path]')
    .description('Print a file tree using system tree with fallback rendering')
    .option('-d, --depth <depth>', 'Maximum tree depth', parseNumberOption)
    .option('-i, --ignore <patterns>', 'Comma-separated ignore names (for example node_modules,.git)')
    .option('--json', 'Output as JSON')
    .action(
      async (
        maybePath: string | undefined,
        options: {
          depth?: number;
          ignore?: string;
          json?: boolean;
        }
      ) => {
        await treeCommand(maybePath, {
          depth: options.depth,
          ignore: parseIgnoreOption(options.ignore),
          json: options.json ?? false
        });
      }
    );

  try {
    await program.parseAsync(argv, { from: 'user' });
  } catch (error) {
    const cliError = toCliError(error);
    logger.cliError({
      code: cliError.code,
      summary: cliError.summary,
      file: cliError.file,
      details: cliError.details,
      hint: cliError.hint,
      docsUrl: cliError.docsUrl
    });
    process.exitCode = 1;
  }
}

function parseNumberOption(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new CliError({
      code: 'INVALID_CLI_OPTION',
      summary: `Invalid numeric option: ${value}.`,
      details: 'Expected a non-negative integer.',
      hint: 'Use values like 0, 1, 30, 120.'
    });
  }
  return parsed;
}

function parsePackageManagerOption(value: string): PackageManager {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'npm' || normalized === 'pnpm' || normalized === 'yarn' || normalized === 'bun') {
    return normalized;
  }

  throw new CliError({
    code: 'INVALID_CLI_OPTION',
    summary: `Invalid package manager option: ${value}.`,
    details: 'Expected one of npm, pnpm, yarn, or bun.',
    hint: 'Use --package-manager pnpm (or npm/yarn/bun).'
  });
}

function parseIgnoreOption(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}
