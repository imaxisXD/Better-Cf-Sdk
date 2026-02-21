import fs from 'node:fs';
import path from 'node:path';
import { ensureJsoncExists, patchJsoncConfig } from './jsonc.js';
import { ensureTomlExists, patchTomlConfig } from './toml.js';
import type { CliConfig, DiscoveryResult } from '../types.js';

export function patchWranglerConfig(config: CliConfig, discovery: DiscoveryResult): string {
  const existing = detectWranglerConfig(config.rootDir);

  if (existing && (existing.endsWith('.jsonc') || existing.endsWith('.json'))) {
    patchJsoncConfig(existing, discovery);
    return existing;
  }

  if (existing && existing.endsWith('.toml')) {
    patchTomlConfig(existing, discovery);
    return existing;
  }

  const created = ensureTomlExists(config.rootDir);
  patchTomlConfig(created, discovery);
  return created;
}

function detectWranglerConfig(rootDir: string): string | undefined {
  const preferred = ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml'];
  for (const fileName of preferred) {
    const absolutePath = path.join(rootDir, fileName);
    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  if (fs.existsSync(path.join(rootDir, 'package.json')) && fs.existsSync(path.join(rootDir, 'src'))) {
    return ensureJsoncExists(rootDir);
  }

  return undefined;
}
