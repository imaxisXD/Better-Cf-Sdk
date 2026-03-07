import path from 'node:path';
import { CliError } from '../errors.js';
import type { CliConfig } from '../types.js';
import { createRegistryCache } from './cache.js';
import { DEFAULT_REGISTRY } from './default-registry.js';
import { registryManifestSchema } from './schema.js';
import type { RegistryItem, ResolvedRegistry } from './types.js';

interface RegistryLoadOptions {
  refresh?: boolean;
}

export async function loadRegistry(
  config: CliConfig,
  options: RegistryLoadOptions = {}
): Promise<ResolvedRegistry> {
  const localItems = DEFAULT_REGISTRY.items;
  const registryConfig = config.registry;
  const url = registryConfig?.url;

  if (!url) {
    return {
      items: localItems,
      source: 'local'
    };
  }

  const cachePath = resolveRegistryCachePath(config);
  const cache = createRegistryCache(cachePath);
  const ttlMs = resolveRegistryTtlMs(config);
  const now = Date.now();

  const cached = await cache.read();
  if (!options.refresh && cached && cached.url === url && now - cached.fetchedAt < ttlMs) {
    return {
      items: mergeRegistryItems(localItems, cached.items),
      source: 'cache'
    };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = registryManifestSchema.parse(await response.json());
    await cache.write({
      url,
      fetchedAt: now,
      items: data.items
    });

    return {
      items: mergeRegistryItems(localItems, data.items),
      source: 'remote'
    };
  } catch (error) {
    if (cached && cached.url === url) {
      return {
        items: mergeRegistryItems(localItems, cached.items),
        source: 'cache'
      };
    }

    throw new CliError({
      code: 'REGISTRY_FETCH_FAILED',
      summary: `Failed to fetch remote registry from ${url}.`,
      details: error instanceof Error ? error.message : String(error),
      hint: 'Set betterCfConfig.registry.url to a valid JSON endpoint or remove it to use local registry only.'
    });
  }
}

export async function clearRegistryCache(config: CliConfig): Promise<string> {
  const cachePath = resolveRegistryCachePath(config);
  const cache = createRegistryCache(cachePath);
  await cache.clear();
  return cachePath;
}

function resolveRegistryCachePath(config: CliConfig): string {
  const registryConfig = config.registry;
  const basePath = registryConfig?.cacheDir ?? '.better-cf/cache';
  return path.isAbsolute(basePath) ? path.join(basePath, 'registry.json') : path.join(config.rootDir, basePath, 'registry.json');
}

function resolveRegistryTtlMs(config: CliConfig): number {
  const ttlHours = config.registry?.cacheTtlHours ?? 24;
  return Math.max(1, ttlHours) * 60 * 60 * 1000;
}

function mergeRegistryItems(localItems: RegistryItem[], remoteItems: RegistryItem[]): RegistryItem[] {
  const merged = new Map<string, RegistryItem>();
  for (const item of localItems) {
    merged.set(item.id, item);
  }
  for (const item of remoteItems) {
    merged.set(item.id, item);
  }
  return [...merged.values()];
}
