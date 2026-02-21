import { generateCode } from '../codegen.js';
import { loadCliConfig } from '../config.js';
import { scanQueues } from '../discovery/scanner.js';
import { generateEnvTypes } from '../env-types.js';
import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { patchWranglerConfig } from '../wrangler/index.js';
import type { GenerateResult } from '../types.js';

export async function runGenerate(rootDir = process.cwd()): Promise<GenerateResult> {
  const config = loadCliConfig(rootDir);
  const discovery = await scanQueues(config);

  for (const diagnostic of discovery.diagnostics) {
    logger.diagnostic(diagnostic);
  }

  const hasErrors = discovery.diagnostics.some((diag) => diag.level === 'error');
  if (hasErrors) {
    throw new CliError({
      code: 'QUEUE_DISCOVERY_FAILED',
      summary: 'Queue discovery failed due to configuration errors.',
      hint: 'Fix the diagnostics above and re-run `better-cf generate`.',
      docsUrl: 'https://github.com/better-cf/better-cf#errors'
    });
  }

  const generated = generateCode(discovery, config);
  const wranglerConfigPath = patchWranglerConfig(config, discovery);
  const envTypeResult = await generateEnvTypes(config);

  return {
    discovery,
    generatedEntryPath: generated.entryPath,
    generatedTypesPath: generated.typesPath,
    wranglerConfigPath,
    autoEnvPath: envTypeResult.autoEnvPath
  };
}

export async function generateCommand(rootDir = process.cwd()): Promise<void> {
  const result = await runGenerate(rootDir);
  logger.success(`Generated ${result.discovery.queues.length} queue(s)`);
  logger.item('entry', result.generatedEntryPath);
  logger.item('types', result.generatedTypesPath);
  logger.item('auto-env', result.autoEnvPath);
  logger.item('wrangler', result.wranglerConfigPath);
}
