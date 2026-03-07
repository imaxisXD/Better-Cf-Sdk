import { generateCode } from '../codegen.js';
import { loadCliConfig } from '../config.js';
import { scanQueues } from '../discovery/scanner.js';
import { generateEnvTypes } from '../env-types.js';
import { generateModernCode } from '../modern-codegen.js';
import { generateModernEnvTypes } from '../modern-env-types.js';
import { scanModernProject } from '../discovery/modern-scanner.js';
import { CliError } from '../errors.js';
import { logger } from '../logger.js';
import { patchWranglerConfig } from '../wrangler/index.js';
import { patchModernWranglerConfig } from '../wrangler/modern.js';
import type { GenerateResult } from '../types.js';

export async function runGenerate(rootDir = process.cwd()): Promise<GenerateResult> {
  const config = loadCliConfig(rootDir);
  const modernDiscovery = await scanModernProject(config);

  if (modernDiscovery.hasModernSurface) {
    for (const diagnostic of modernDiscovery.diagnostics) {
      logger.diagnostic(diagnostic);
    }

    const hasErrors = modernDiscovery.diagnostics.some((diag) => diag.level === 'error');
    if (hasErrors) {
      throw new CliError({
        code: 'QUEUE_DISCOVERY_FAILED',
        summary: 'Modern better-cf discovery failed due to configuration errors.',
        hint: 'Fix the diagnostics above and re-run `better-cf generate`.'
      });
    }

    const generated = generateModernCode(modernDiscovery, config);
    const wranglerConfigPath = patchModernWranglerConfig(config, modernDiscovery);
    const envTypeResult = await generateModernEnvTypes(config);

    return {
      discovery: {
        queues: [],
        diagnostics: modernDiscovery.diagnostics
      },
      modernDiscovery,
      generatedEntryPath: generated.entryPath,
      generatedTypesPath: generated.typesPath,
      wranglerConfigPath,
      autoEnvPath: envTypeResult.autoEnvPath
    };
  }

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
  if (result.modernDiscovery) {
    logger.success(
      `Generated ${result.modernDiscovery.queues.length} queue(s) and ${result.modernDiscovery.durableObjects.length} durable object(s)`
    );
  } else {
    logger.success(`Generated ${result.discovery.queues.length} queue(s)`);
  }
  logger.item('entry', result.generatedEntryPath);
  logger.item('types', result.generatedTypesPath);
  logger.item('auto-env', result.autoEnvPath);
  logger.item('wrangler', result.wranglerConfigPath);
}
