import path from 'node:path';
import { loadCliConfig } from '../config.js';
import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { loadRegistry, clearRegistryCache } from '../registry/client.js';
import { installRegistryItem } from '../registry/installer.js';

interface RegistryCommandOptions {
  refresh?: boolean;
}

export async function registryListCommand(
  options: RegistryCommandOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const config = loadCliConfig(rootDir);
  const registry = await loadRegistry(config, options);

  logger.section(`Registry entries (${registry.source})`);
  for (const item of registry.items) {
    logger.item(item.id, item.description);
  }
}

export async function registryInfoCommand(
  id: string,
  options: RegistryCommandOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const config = loadCliConfig(rootDir);
  const registry = await loadRegistry(config, options);
  const item = registry.items.find((entry) => entry.id === id);

  if (!item) {
    throw new CliError({
      code: 'REGISTRY_ENTRY_NOT_FOUND',
      summary: `Registry entry "${id}" was not found.`,
      hint: 'Run `better-cf registry list` to inspect available entry IDs.'
    });
  }

  logger.section(`Registry entry: ${item.id}`);
  logger.item('description', item.description);
  logger.item('files', String(item.files.length));
  if (item.dependencies?.length) {
    logger.item('dependencies', item.dependencies.join(', '));
  }
  if (item.devDependencies?.length) {
    logger.item('devDependencies', item.devDependencies.join(', '));
  }
}

export async function registryAddCommand(
  id: string,
  maybeTarget: string | undefined,
  options: RegistryCommandOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const config = loadCliConfig(rootDir);
  const registry = await loadRegistry(config, options);
  const item = registry.items.find((entry) => entry.id === id);

  if (!item) {
    throw new CliError({
      code: 'REGISTRY_ENTRY_NOT_FOUND',
      summary: `Registry entry "${id}" was not found.`,
      hint: 'Run `better-cf registry list` to inspect available entry IDs.'
    });
  }

  const targetDir = path.resolve(rootDir, maybeTarget ?? '.');
  const result = await installRegistryItem(item, targetDir);

  logger.success(`Installed registry entry ${result.itemId}`);
  logger.item('target', result.targetDir);
  for (const file of result.files) {
    logger.item('file', file);
  }

  if (item.dependencies?.length) {
    logger.item('deps', `Install runtime deps: ${item.dependencies.join(', ')}`);
  }
  if (item.devDependencies?.length) {
    logger.item('dev-deps', `Install dev deps: ${item.devDependencies.join(', ')}`);
  }
}

export async function registryCacheClearCommand(rootDir = process.cwd()): Promise<void> {
  const config = loadCliConfig(rootDir);
  const cachePath = await clearRegistryCache(config);
  logger.success(`Cleared registry cache at ${cachePath}`);
}
