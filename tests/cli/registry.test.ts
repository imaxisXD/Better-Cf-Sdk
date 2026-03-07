import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  registryAddCommand,
  registryInfoCommand,
  registryListCommand
} from '../../src/cli/commands/registry.js';
import { loadCliConfig } from '../../src/cli/config.js';
import { clearRegistryCache, loadRegistry } from '../../src/cli/registry/client.js';
import { makeTempDir } from '../helpers/fs.js';

describe('registry commands', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('supports local registry list/info/add flow', async () => {
    const temp = makeTempDir('better-cf-registry-local-');

    await registryListCommand({}, temp);
    await registryInfoCommand('queue/basic', {}, temp);
    await registryAddCommand('queue/basic', '.', {}, temp);

    expect(fs.existsSync(path.join(temp, 'src/queues/signup.ts'))).toBe(true);
  });

  it('fetches remote registry and falls back to cache', async () => {
    const temp = makeTempDir('better-cf-registry-remote-');
    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `export const betterCfConfig = {
  registry: {
    url: 'https://example.com/registry.json',
    cacheTtlHours: 24
  }
};
`,
      'utf8'
    );

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          items: [
            {
              id: 'remote/item',
              description: 'Remote registry item',
              files: [{ path: 'remote.txt', content: 'remote-content' }]
            }
          ]
        };
      }
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const first = await loadRegistry(loadCliConfig(temp), { refresh: true });
    expect(first.source).toBe('remote');
    expect(first.items.some((item) => item.id === 'remote/item')).toBe(true);

    fetchMock.mockImplementationOnce(async () => {
      throw new Error('offline');
    });
    const second = await loadRegistry(loadCliConfig(temp));
    expect(second.source).toBe('cache');
    expect(second.items.some((item) => item.id === 'remote/item')).toBe(true);
  });

  it('clears registry cache file', async () => {
    const temp = makeTempDir('better-cf-registry-cache-');
    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `export const betterCfConfig = {
  registry: {
    url: 'https://example.com/registry.json',
    cacheTtlHours: 24
  }
};
`,
      'utf8'
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        async json() {
          return {
            items: [
              {
                id: 'remote/item',
                description: 'Remote registry item',
                files: [{ path: 'remote.txt', content: 'remote-content' }]
              }
            ]
          };
        }
      })) as unknown as typeof fetch
    );

    const config = loadCliConfig(temp);
    await loadRegistry(config, { refresh: true });
    const cachePath = path.join(temp, '.better-cf/cache/registry.json');
    expect(fs.existsSync(cachePath)).toBe(true);

    await clearRegistryCache(config);
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it('throws when remote registry payload is invalid', async () => {
    const temp = makeTempDir('better-cf-registry-invalid-');
    fs.writeFileSync(
      path.join(temp, 'better-cf.config.ts'),
      `export const betterCfConfig = {
  registry: {
    url: 'https://example.com/registry.json',
    cacheTtlHours: 24
  }
};
`,
      'utf8'
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        async json() {
          return { notItems: [] };
        }
      })) as unknown as typeof fetch
    );

    await expect(loadRegistry(loadCliConfig(temp), { refresh: true })).rejects.toMatchObject({
      code: 'REGISTRY_FETCH_FAILED'
    });
  });
});
