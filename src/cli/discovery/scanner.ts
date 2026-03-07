import fs from 'node:fs';
import path from 'node:path';
import type {
  BindingPattern,
  CallExpression,
  Expression,
  ExportDefaultDeclaration,
  ExportNamedDeclaration,
  ObjectExpression,
  ObjectProperty,
  Program,
  VariableDeclaration
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { deriveBindingName, deriveQueueName, makeImportName } from './naming.js';
import type {
  CliConfig,
  DiscoveryDiagnostic,
  DiscoveryResult,
  DiscoveredQueue,
  ExtractedQueueConfig
} from '../types.js';

const RESERVED_KEYS = new Set([
  'retry',
  'retryDelay',
  'deadLetter',
  'deliveryDelay',
  'visibilityTimeout',
  'batch',
  'consumer',
  'args',
  'handler',
  'batchHandler',
  'message',
  'process',
  'processBatch',
  'onFailure'
]);

const DEFINE_QUEUE_HELPERS = new Set(['defineQueue', 'defineQueues']);

export async function scanQueues(config: CliConfig): Promise<DiscoveryResult> {
  const diagnostics: DiscoveryDiagnostic[] = [];
  const candidates = collectSourceFiles(config.rootDir, config.ignore);
  const queues: DiscoveredQueue[] = [];

  for (const absolutePath of candidates) {
    try {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const parsed = parseSync(absolutePath, source, {
        lang: absolutePath.endsWith('.tsx') ? 'tsx' : 'ts',
        sourceType: 'module'
      });

      if (parsed.errors.length > 0) {
        diagnostics.push({
          level: 'error',
          code: 'SCANNER_FILE_ERROR',
          message: `Failed to parse ${absolutePath}: ${parsed.errors[0]?.message ?? 'unknown parser error'}`,
          filePath: path.relative(config.rootDir, absolutePath)
        });
        continue;
      }

      const program = parsed.program;
      const localDefineQueueNames = getDefineQueueLocalNames(program);
      if (localDefineQueueNames.size === 0) {
        continue;
      }

      const variableInitMap = collectVariableInitializers(program);

      for (const statement of program.body) {
        if (statement.type !== 'ExportNamedDeclaration') {
          continue;
        }

        discoverNamedExportsFromStatement(
          statement,
          localDefineQueueNames,
          variableInitMap,
          absolutePath,
          config.rootDir,
          queues,
          diagnostics
        );
      }

      for (const statement of program.body) {
        if (statement.type !== 'ExportDefaultDeclaration') {
          continue;
        }

        discoverDefaultExportFromStatement(
          statement,
          localDefineQueueNames,
          variableInitMap,
          absolutePath,
          config.rootDir,
          queues,
          diagnostics
        );
      }
    } catch (error) {
      diagnostics.push({
        level: 'error',
        code: 'SCANNER_FILE_ERROR',
        message: `Failed to parse ${absolutePath}: ${toErrorMessage(error)}`,
        filePath: path.relative(config.rootDir, absolutePath)
      });
    }
  }

  addConflictDiagnostics(queues, diagnostics);

  if (queues.length === 0) {
    diagnostics.push({
      level: 'warning',
      code: 'NO_QUEUES_FOUND',
      message: 'No defineQueue/defineQueues exports found in this project.'
    });
  }

  return {
    queues,
    diagnostics
  };
}

function discoverNamedExportsFromStatement(
  statement: ExportNamedDeclaration,
  localDefineQueueNames: Set<string>,
  variableInitMap: Map<string, Expression>,
  absolutePath: string,
  rootDir: string,
  queues: DiscoveredQueue[],
  diagnostics: DiscoveryDiagnostic[]
): void {
  if (!statement.declaration || statement.declaration.type !== 'VariableDeclaration') {
    return;
  }

  for (const declaration of statement.declaration.declarations) {
    const exportName = getBindingName(declaration.id);
    if (!exportName || !declaration.init) {
      continue;
    }

    const call = resolveCallExpressionFromExpression(declaration.init, variableInitMap);
    if (!call || !isDefineQueueCall(call, localDefineQueueNames)) {
      continue;
    }

    const queueName = deriveQueueName(exportName);
    const extracted = extractQueueConfig(call, absolutePath, diagnostics, rootDir);

    queues.push({
      exportName,
      queueName,
      bindingName: deriveBindingName(queueName),
      filePath: path.relative(rootDir, absolutePath),
      absoluteFilePath: absolutePath,
      isDefaultExport: false,
      importName: makeImportName(queueName, false, exportName),
      config: extracted
    });
  }
}

function discoverDefaultExportFromStatement(
  statement: ExportDefaultDeclaration,
  localDefineQueueNames: Set<string>,
  variableInitMap: Map<string, Expression>,
  absolutePath: string,
  rootDir: string,
  queues: DiscoveredQueue[],
  diagnostics: DiscoveryDiagnostic[]
): void {
  const declaration = statement.declaration;
  if (
    declaration.type !== 'Identifier' &&
    declaration.type !== 'CallExpression' &&
    declaration.type !== 'ParenthesizedExpression'
  ) {
    return;
  }

  const call = resolveCallExpressionFromExpression(declaration, variableInitMap);
  if (!call || !isDefineQueueCall(call, localDefineQueueNames)) {
    return;
  }

  const basename = path.basename(absolutePath, path.extname(absolutePath));
  const queueName = deriveQueueName(basename);
  const extracted = extractQueueConfig(call, absolutePath, diagnostics, rootDir);

  queues.push({
    exportName: 'default',
    queueName,
    bindingName: deriveBindingName(queueName),
    filePath: path.relative(rootDir, absolutePath),
    absoluteFilePath: absolutePath,
    isDefaultExport: true,
    importName: makeImportName(queueName, true, 'default'),
    config: extracted
  });
}

function collectVariableInitializers(program: Program): Map<string, Expression> {
  const map = new Map<string, Expression>();

  for (const statement of program.body) {
    if (statement.type === 'VariableDeclaration') {
      collectVariableDeclarationInitializers(statement, map);
      continue;
    }

    if (statement.type === 'ExportNamedDeclaration' && statement.declaration?.type === 'VariableDeclaration') {
      collectVariableDeclarationInitializers(statement.declaration, map);
    }
  }

  return map;
}

function collectVariableDeclarationInitializers(
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

function resolveCallExpressionFromExpression(
  expression: Expression,
  variableInitMap: Map<string, Expression>,
  visited = new Set<string>()
): CallExpression | undefined {
  const unwrapped = unwrapExpression(expression);

  if (unwrapped.type === 'CallExpression') {
    return unwrapped;
  }

  if (unwrapped.type !== 'Identifier') {
    return undefined;
  }

  if (visited.has(unwrapped.name)) {
    return undefined;
  }

  const initializer = variableInitMap.get(unwrapped.name);
  if (!initializer) {
    return undefined;
  }

  visited.add(unwrapped.name);
  return resolveCallExpressionFromExpression(initializer, variableInitMap, visited);
}

function unwrapExpression(expression: Expression): Expression {
  if (expression.type === 'ParenthesizedExpression') {
    return unwrapExpression(expression.expression);
  }

  return expression;
}

function collectSourceFiles(rootDir: string, ignore: string[]): string[] {
  const files: string[] = [];
  const ignoreSet = new Set(ignore);

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith('.git')) {
        continue;
      }

      if (ignoreSet.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) {
        continue;
      }

      const content = fs.readFileSync(absolutePath, 'utf8');
      if (content.includes('defineQueue') || content.includes('defineQueues')) {
        files.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return files;
}

function getDefineQueueLocalNames(program: Program): Set<string> {
  const names = new Set<string>();

  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') {
      continue;
    }

    if (!statement.source.value.includes('better-cf.config')) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier') {
        continue;
      }

      const importedName = getModuleExportName(specifier.imported);
      if (!importedName || !DEFINE_QUEUE_HELPERS.has(importedName)) {
        continue;
      }

      names.add(specifier.local.name);
    }
  }

  return names;
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

function isDefineQueueCall(call: CallExpression, localNames: Set<string>): boolean {
  const callee = unwrapExpression(call.callee);
  if (callee.type !== 'Identifier') {
    return false;
  }

  return localNames.has(callee.name);
}

function getBindingName(binding: BindingPattern): string | undefined {
  if (binding.type === 'Identifier') {
    return binding.name;
  }
  return undefined;
}

function extractQueueConfig(
  call: CallExpression,
  absolutePath: string,
  diagnostics: DiscoveryDiagnostic[],
  rootDir: string
): ExtractedQueueConfig {
  const firstArg = call.arguments[0];
  if (!firstArg || firstArg.type !== 'ObjectExpression') {
    return {
      hasHandler: false,
      hasBatchHandler: false,
      isMultiJob: false
    };
  }

  const objectLiteral = firstArg;
  const hasHandler = hasProperty(objectLiteral, 'handler');
  const hasBatchHandler = hasProperty(objectLiteral, 'batchHandler');

  if (hasHandler && hasBatchHandler) {
    diagnostics.push({
      level: 'error',
      code: 'INVALID_HANDLER_MODE',
      message: 'Queue config cannot include both handler and batchHandler.',
      filePath: path.relative(rootDir, absolutePath),
      hint: 'Pick exactly one processing mode for worker consumers.'
    });
  }

  const retry = readNumberProperty(objectLiteral, 'retry', diagnostics, absolutePath, rootDir);
  const retryDelay = readNumberOrStringProperty(
    objectLiteral,
    'retryDelay',
    diagnostics,
    absolutePath,
    rootDir
  );
  const deadLetter = readStringProperty(objectLiteral, 'deadLetter', diagnostics, absolutePath, rootDir);
  const deliveryDelay = readNumberOrStringProperty(
    objectLiteral,
    'deliveryDelay',
    diagnostics,
    absolutePath,
    rootDir
  );
  const topLevelVisibilityTimeout = readNumberOrStringProperty(
    objectLiteral,
    'visibilityTimeout',
    diagnostics,
    absolutePath,
    rootDir
  );

  const consumer = readConsumerConfig(objectLiteral, diagnostics, absolutePath, rootDir);
  const consumerType = consumer?.type;
  const visibilityTimeout = consumer?.visibilityTimeout ?? topLevelVisibilityTimeout;

  const batchObject = getObjectLiteralProperty(objectLiteral, 'batch');
  const batchMaxSize = batchObject
    ? readNumberProperty(batchObject, 'maxSize', diagnostics, absolutePath, rootDir)
    : undefined;
  const batchTimeout = batchObject
    ? readNumberOrStringProperty(batchObject, 'timeout', diagnostics, absolutePath, rootDir)
    : undefined;
  const maxConcurrency = batchObject
    ? readNumberProperty(batchObject, 'maxConcurrency', diagnostics, absolutePath, rootDir)
    : undefined;

  let isMultiJob = false;
  if (!hasHandler && !hasBatchHandler) {
    for (const property of objectLiteral.properties) {
      if (property.type !== 'Property') {
        continue;
      }

      const propertyName = getPropertyName(property);
      if (!propertyName || RESERVED_KEYS.has(propertyName)) {
        continue;
      }

      const initializer = unwrapExpression(property.value);
      if (initializer.type !== 'ObjectExpression') {
        continue;
      }

      if (hasProperty(initializer, 'args') && hasProperty(initializer, 'handler')) {
        isMultiJob = true;
        break;
      }
    }
  }

  const relativeFile = path.relative(rootDir, absolutePath);

  if (consumerType === 'http_pull' && (hasHandler || hasBatchHandler)) {
    diagnostics.push({
      level: 'error',
      code: 'INVALID_PULL_MODE_HANDLER',
      message: 'Queue with consumer.type="http_pull" cannot include handler/batchHandler.',
      filePath: relativeFile,
      hint: 'Remove handlers for pull consumers and consume via HTTP pull APIs.'
    });
  }

  if (consumerType === 'http_pull' && isMultiJob) {
    diagnostics.push({
      level: 'error',
      code: 'UNSUPPORTED_PULL_MULTIJOB',
      message: 'Multi-job queue mode is not supported when consumer.type="http_pull".',
      filePath: relativeFile,
      hint: 'Split jobs into separate queues when using http_pull.'
    });
  }

  return {
    retry,
    retryDelay,
    deadLetter,
    deliveryDelay,
    batchMaxSize,
    batchTimeout,
    maxConcurrency,
    visibilityTimeout,
    consumerType,
    hasHandler,
    hasBatchHandler,
    isMultiJob
  };
}

function hasProperty(objectLiteral: ObjectExpression, name: string): boolean {
  return objectLiteral.properties.some((property) => {
    return property.type === 'Property' && getPropertyName(property) === name;
  });
}

function getObjectLiteralProperty(
  objectLiteral: ObjectExpression,
  name: string
): ObjectExpression | undefined {
  for (const property of objectLiteral.properties) {
    if (property.type !== 'Property' || getPropertyName(property) !== name) {
      continue;
    }

    const initializer = unwrapExpression(property.value);
    if (initializer.type === 'ObjectExpression') {
      return initializer;
    }
  }

  return undefined;
}

function readNumberProperty(
  objectLiteral: ObjectExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): number | undefined {
  const initializer = getPropertyInitializer(objectLiteral, name);
  if (!initializer) {
    return undefined;
  }

  if (initializer.type !== 'Literal' || typeof initializer.value !== 'number') {
    diagnostics.push({
      level: 'warning',
      code: 'NON_STATIC_CONFIG',
      message: `Config key ${name} in ${path.relative(rootDir, absolutePath)} is not a static number literal.`,
      filePath: path.relative(rootDir, absolutePath)
    });
    return undefined;
  }

  return initializer.value;
}

function readStringProperty(
  objectLiteral: ObjectExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): string | undefined {
  const initializer = getPropertyInitializer(objectLiteral, name);
  if (!initializer) {
    return undefined;
  }

  if (initializer.type !== 'Literal' || typeof initializer.value !== 'string') {
    diagnostics.push({
      level: 'warning',
      code: 'NON_STATIC_CONFIG',
      message: `Config key ${name} in ${path.relative(rootDir, absolutePath)} is not a static string literal.`,
      filePath: path.relative(rootDir, absolutePath)
    });
    return undefined;
  }

  return readRawStringLiteral(initializer.raw, initializer.value);
}

function readNumberOrStringProperty(
  objectLiteral: ObjectExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): number | string | undefined {
  const initializer = getPropertyInitializer(objectLiteral, name);
  if (!initializer) {
    return undefined;
  }

  if (initializer.type === 'Literal' && typeof initializer.value === 'number') {
    return initializer.value;
  }

  if (initializer.type === 'Literal' && typeof initializer.value === 'string') {
    return readRawStringLiteral(initializer.raw, initializer.value);
  }

  diagnostics.push({
    level: 'warning',
    code: 'NON_STATIC_CONFIG',
    message: `Config key ${name} in ${path.relative(rootDir, absolutePath)} is not static.`,
    filePath: path.relative(rootDir, absolutePath)
  });

  return undefined;
}

function readConsumerConfig(
  objectLiteral: ObjectExpression,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): { type: 'worker' | 'http_pull'; visibilityTimeout?: string | number } | undefined {
  const consumerObject = getObjectLiteralProperty(objectLiteral, 'consumer');
  if (!consumerObject) {
    return undefined;
  }

  const typeValue = readStringProperty(consumerObject, 'type', diagnostics, absolutePath, rootDir);
  if (!typeValue) {
    return undefined;
  }

  if (typeValue !== 'worker' && typeValue !== 'http_pull') {
    diagnostics.push({
      level: 'warning',
      code: 'NON_STATIC_CONFIG',
      message: `Unknown consumer.type "${typeValue}" in ${path.relative(rootDir, absolutePath)}.`,
      filePath: path.relative(rootDir, absolutePath)
    });
    return undefined;
  }

  const visibilityTimeout = readNumberOrStringProperty(
    consumerObject,
    'visibilityTimeout',
    diagnostics,
    absolutePath,
    rootDir
  );

  return {
    type: typeValue,
    visibilityTimeout
  };
}

function getPropertyInitializer(objectLiteral: ObjectExpression, name: string): Expression | undefined {
  for (const property of objectLiteral.properties) {
    if (property.type !== 'Property' || getPropertyName(property) !== name) {
      continue;
    }

    return unwrapExpression(property.value);
  }

  return undefined;
}

function getPropertyName(property: ObjectProperty): string | undefined {
  if (property.computed) {
    return undefined;
  }

  if (property.key.type === 'Identifier') {
    return property.key.name;
  }

  if (property.key.type === 'Literal' && typeof property.key.value === 'string') {
    return property.key.value;
  }

  return undefined;
}

function readRawStringLiteral(raw: string | null, fallback: string): string {
  if (!raw || raw.length < 2) {
    return fallback;
  }

  const quote = raw[0];
  if ((quote !== '\'' && quote !== '"' && quote !== '`') || raw[raw.length - 1] !== quote) {
    return fallback;
  }

  return raw.slice(1, -1);
}

function addConflictDiagnostics(queues: DiscoveredQueue[], diagnostics: DiscoveryDiagnostic[]): void {
  const queueNameMap = new Map<string, string[]>();
  const bindingNameMap = new Map<string, string[]>();

  for (const queue of queues) {
    queueNameMap.set(queue.queueName, [...(queueNameMap.get(queue.queueName) ?? []), queue.filePath]);
    bindingNameMap.set(
      queue.bindingName,
      [...(bindingNameMap.get(queue.bindingName) ?? []), queue.filePath]
    );
  }

  for (const [queueName, files] of queueNameMap.entries()) {
    if (files.length < 2) {
      continue;
    }

    diagnostics.push({
      level: 'error',
      code: 'QUEUE_NAME_CONFLICT',
      message: `Queue name conflict for ${queueName}: ${files.join(', ')}`
    });
  }

  for (const [bindingName, files] of bindingNameMap.entries()) {
    if (files.length < 2) {
      continue;
    }

    diagnostics.push({
      level: 'error',
      code: 'BINDING_NAME_CONFLICT',
      message: `Binding name conflict for ${bindingName}: ${files.join(', ')}`
    });
  }
}

function toErrorMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  return String(value);
}
