import fs from 'node:fs/promises';
import path from 'node:path';
import { CliError } from '../errors.js';
import { registryCacheRecordSchema } from './schema.js';
import type { RegistryCacheRecord } from './types.js';

interface CacheAdapter<T> {
  read(): Promise<T | undefined>;
  write(value: T): Promise<void>;
  clear(): Promise<void>;
}

interface CacheOptions<T> {
  cachePath: string;
  parse: (value: unknown) => T;
}

export function createCache<T>(options: CacheOptions<T>): CacheAdapter<T> {
  return {
    async read(): Promise<T | undefined> {
      try {
        const raw = await fs.readFile(options.cachePath, 'utf8');
        return options.parse(JSON.parse(raw));
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'ENOENT'
        ) {
          return undefined;
        }

        throw new CliError({
          code: 'REGISTRY_CACHE_READ_FAILED',
          summary: 'Failed to read registry cache.',
          details: error instanceof Error ? error.message : String(error),
          file: options.cachePath
        });
      }
    },

    async write(value: T): Promise<void> {
      try {
        await fs.mkdir(path.dirname(options.cachePath), { recursive: true });
        await fs.writeFile(options.cachePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      } catch (error) {
        throw new CliError({
          code: 'REGISTRY_CACHE_WRITE_FAILED',
          summary: 'Failed to write registry cache.',
          details: error instanceof Error ? error.message : String(error),
          file: options.cachePath
        });
      }
    },

    async clear(): Promise<void> {
      try {
        await fs.rm(options.cachePath, { force: true });
      } catch (error) {
        throw new CliError({
          code: 'REGISTRY_CACHE_CLEAR_FAILED',
          summary: 'Failed to clear registry cache.',
          details: error instanceof Error ? error.message : String(error),
          file: options.cachePath
        });
      }
    }
  };
}

export function createRegistryCache(cachePath: string): CacheAdapter<RegistryCacheRecord> {
  return createCache({
    cachePath,
    parse: (value) => registryCacheRecordSchema.parse(value)
  });
}
