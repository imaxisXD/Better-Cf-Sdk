import fs from 'node:fs';
import path from 'node:path';
import type {
  BindingPattern,
  ExportNamedDeclaration,
  Expression,
  ObjectExpression,
  ObjectProperty,
  Program,
  VariableDeclaration
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import type { CliConfig } from './types.js';

const DEFAULT_IGNORE = ['node_modules', '.better-cf', 'dist', '.wrangler'];

export function loadCliConfig(rootDir = process.cwd()): CliConfig {
  const defaults: CliConfig = {
    rootDir,
    ignore: [...DEFAULT_IGNORE],
    workerEntry: undefined,
    legacyServiceWorker: false,
    inferEnvTypes: true,
    registry: {
      url: undefined,
      cacheTtlHours: 24,
      cacheDir: '.better-cf/cache'
    }
  };

  const configPath = path.join(rootDir, 'better-cf.config.ts');
  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  const sourceText = fs.readFileSync(configPath, 'utf8');
  const parsed = parseSync(configPath, sourceText, {
    lang: 'ts',
    sourceType: 'module'
  });

  if (parsed.errors.length > 0) {
    return defaults;
  }

  const configObject = findBetterCfConfigObject(parsed.program);
  if (!configObject) {
    return defaults;
  }

  const workerEntry = readString(configObject, 'workerEntry');
  const legacyServiceWorker = readBoolean(configObject, 'legacyServiceWorker');
  const inferEnvTypes = readBoolean(configObject, 'inferEnvTypes');
  const ignore = readStringArray(configObject, 'ignore');
  const registry = readRegistryConfig(configObject);

  return {
    rootDir,
    workerEntry,
    legacyServiceWorker: legacyServiceWorker ?? defaults.legacyServiceWorker,
    inferEnvTypes: inferEnvTypes ?? defaults.inferEnvTypes,
    ignore: ignore ? [...new Set([...defaults.ignore, ...ignore])] : defaults.ignore,
    registry: {
      url: registry.url,
      cacheTtlHours: registry.cacheTtlHours ?? defaults.registry?.cacheTtlHours,
      cacheDir: registry.cacheDir ?? defaults.registry?.cacheDir
    }
  };
}

function findBetterCfConfigObject(program: Program): ObjectExpression | undefined {
  const variableMap = new Map<string, Expression>();

  for (const statement of program.body) {
    if (statement.type === 'VariableDeclaration') {
      collectVariableInitializers(statement, variableMap);
      continue;
    }

    if (statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration') {
      collectVariableInitializers(statement.declaration, variableMap);
      const candidate = findInVariableDeclaration(statement.declaration, 'betterCfConfig');
      if (candidate) {
        return candidate;
      }
    }
  }

  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration') {
      continue;
    }

    const fromSpecifier = resolveExportSpecifierObject(statement, variableMap);
    if (fromSpecifier) {
      return fromSpecifier;
    }
  }

  return undefined;
}

function resolveExportSpecifierObject(
  declaration: ExportNamedDeclaration,
  variableMap: Map<string, Expression>
): ObjectExpression | undefined {
  if (declaration.declaration) {
    return undefined;
  }

  for (const specifier of declaration.specifiers) {
    const localName = getModuleExportName(specifier.local);
    const exportedName = getModuleExportName(specifier.exported);
    if (!localName || !exportedName) {
      continue;
    }
    if (localName !== 'betterCfConfig' && exportedName !== 'betterCfConfig') {
      continue;
    }

    const expression = variableMap.get(localName);
    if (expression?.type === 'ObjectExpression') {
      return expression;
    }
  }

  return undefined;
}

function getModuleExportName(node: { type: string; name?: string; value?: unknown }): string | undefined {
  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }

  return undefined;
}

function collectVariableInitializers(
  declaration: VariableDeclaration,
  target: Map<string, Expression>
): void {
  for (const variable of declaration.declarations) {
    const name = getBindingName(variable.id);
    if (!name || !variable.init) {
      continue;
    }

    target.set(name, variable.init);
  }
}

function findInVariableDeclaration(
  declaration: VariableDeclaration,
  variableName: string
): ObjectExpression | undefined {
  for (const variable of declaration.declarations) {
    const name = getBindingName(variable.id);
    if (name !== variableName) {
      continue;
    }

    if (variable.init?.type === 'ObjectExpression') {
      return variable.init;
    }
  }

  return undefined;
}

function getBindingName(binding: BindingPattern): string | undefined {
  if (binding.type === 'Identifier') {
    return binding.name;
  }
  return undefined;
}

function readString(node: ObjectExpression, key: string): string | undefined {
  const value = readPropertyValue(node, key);
  if (value?.type === 'Literal' && typeof value.value === 'string') {
    return value.value;
  }
  return undefined;
}

function readBoolean(node: ObjectExpression, key: string): boolean | undefined {
  const value = readPropertyValue(node, key);
  if (value?.type === 'Literal' && typeof value.value === 'boolean') {
    return value.value;
  }
  return undefined;
}

function readNumber(node: ObjectExpression, key: string): number | undefined {
  const value = readPropertyValue(node, key);
  if (value?.type === 'Literal' && typeof value.value === 'number') {
    return value.value;
  }
  return undefined;
}

function readStringArray(node: ObjectExpression, key: string): string[] | undefined {
  const value = readPropertyValue(node, key);
  if (!value || value.type !== 'ArrayExpression') {
    return undefined;
  }

  const values = value.elements
    .map((element) => {
      if (!element || element.type !== 'Literal' || typeof element.value !== 'string') {
        return undefined;
      }
      return element.value;
    })
    .filter((entry): entry is string => entry !== undefined);

  return values.length > 0 ? values : undefined;
}

function readRegistryConfig(node: ObjectExpression): {
  url?: string;
  cacheTtlHours?: number;
  cacheDir?: string;
} {
  const value = readPropertyValue(node, 'registry');
  if (!value || value.type !== 'ObjectExpression') {
    return {};
  }

  return {
    url: readString(value, 'url'),
    cacheTtlHours: readNumber(value, 'cacheTtlHours'),
    cacheDir: readString(value, 'cacheDir')
  };
}

function readPropertyValue(node: ObjectExpression, key: string): Expression | undefined {
  for (const property of node.properties) {
    if (!isNamedProperty(property, key)) {
      continue;
    }
    return property.value;
  }

  return undefined;
}

function isNamedProperty(property: unknown, key: string): property is ObjectProperty {
  if (!property || typeof property !== 'object') {
    return false;
  }

  const node = property as Partial<ObjectProperty>;
  if (node.type !== 'Property' || node.kind !== 'init' || node.computed) {
    return false;
  }

  if (!node.key || typeof node.key !== 'object') {
    return false;
  }

  if (node.key.type === 'Identifier') {
    return node.key.name === key;
  }

  if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
    return node.key.value === key;
  }

  return false;
}

export function resolveWorkerEntry(config: CliConfig): string {
  const candidates = [
    config.workerEntry,
    'worker.ts',
    'src/worker.ts',
    'index.ts',
    'src/index.ts'
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const absolutePath = path.isAbsolute(candidate)
      ? candidate
      : path.join(config.rootDir, candidate);

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  throw new Error(
    'Could not find worker entry. Provide betterCfConfig.workerEntry in better-cf.config.ts or create worker.ts.'
  );
}
