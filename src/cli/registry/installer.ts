import fs from 'node:fs/promises';
import path from 'node:path';
import { CliError } from '../errors.js';
import type { RegistryItem } from './types.js';

export interface InstallRegistryItemResult {
  itemId: string;
  targetDir: string;
  files: string[];
}

export async function installRegistryItem(
  item: RegistryItem,
  targetDir: string
): Promise<InstallRegistryItemResult> {
  const written: string[] = [];

  for (const file of item.files) {
    const outputPath = path.resolve(targetDir, file.path);
    assertWithinTarget(targetDir, outputPath);

    await ensurePathDoesNotExist(outputPath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, file.content, 'utf8');

    if (file.executable) {
      await fs.chmod(outputPath, 0o755);
    }

    written.push(outputPath);
  }

  return {
    itemId: item.id,
    targetDir,
    files: written
  };
}

function assertWithinTarget(targetDir: string, outputPath: string): void {
  const normalizedTarget = path.resolve(targetDir);
  if (outputPath === normalizedTarget) {
    return;
  }

  if (!outputPath.startsWith(`${normalizedTarget}${path.sep}`)) {
    throw new CliError({
      code: 'REGISTRY_INVALID_TEMPLATE_PATH',
      summary: `Registry entry writes outside target directory: ${outputPath}.`,
      hint: 'Update the registry entry file paths to stay inside the target directory.'
    });
  }
}

async function ensurePathDoesNotExist(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
    throw new CliError({
      code: 'REGISTRY_TARGET_EXISTS',
      summary: `Registry install would overwrite existing file: ${filePath}.`,
      hint: 'Move or remove the file before running registry add.'
    });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'ENOENT'
    ) {
      return;
    }

    if (error instanceof CliError) {
      throw error;
    }

    throw new CliError({
      code: 'REGISTRY_TARGET_ACCESS_FAILED',
      summary: `Failed to access target file path: ${filePath}.`,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
