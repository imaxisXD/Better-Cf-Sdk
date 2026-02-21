import fs from 'node:fs';
import path from 'node:path';
import { Node, Project, SyntaxKind, type CallExpression, type ObjectLiteralExpression } from 'ts-morph';
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
  'message',
  'process',
  'processBatch',
  'onFailure'
]);

export async function scanQueues(config: CliConfig): Promise<DiscoveryResult> {
  const diagnostics: DiscoveryDiagnostic[] = [];
  const candidates = collectSourceFiles(config.rootDir, config.ignore);

  const project = createProject(config.rootDir);
  const queues: DiscoveredQueue[] = [];

  for (const absolutePath of candidates) {
    try {
      const sourceFile = project.addSourceFileAtPath(absolutePath);
      const localDefineQueueNames = getDefineQueueLocalNames(sourceFile);
      if (localDefineQueueNames.size === 0) {
        project.removeSourceFile(sourceFile);
        continue;
      }

      for (const declaration of sourceFile.getVariableDeclarations()) {
        const variableStatement = declaration.getVariableStatement();
        if (!variableStatement || !variableStatement.isExported()) {
          continue;
        }

        const call = declaration.getInitializerIfKind(SyntaxKind.CallExpression);
        if (!call || !isDefineQueueCall(call, localDefineQueueNames)) {
          continue;
        }

        const exportName = declaration.getName();
        const queueName = deriveQueueName(exportName);
        const extracted = extractQueueConfig(call, absolutePath, diagnostics, config.rootDir);

        queues.push({
          exportName,
          queueName,
          bindingName: deriveBindingName(queueName),
          filePath: path.relative(config.rootDir, absolutePath),
          absoluteFilePath: absolutePath,
          isDefaultExport: false,
          importName: makeImportName(queueName, false, exportName),
          config: extracted
        });
      }

      for (const exportAssignment of sourceFile.getExportAssignments()) {
        if (exportAssignment.isExportEquals()) {
          continue;
        }

        const call = resolveCallExpressionFromExportAssignment(exportAssignment.getExpression());
        if (!call || !isDefineQueueCall(call, localDefineQueueNames)) {
          continue;
        }

        const basename = path.basename(absolutePath, path.extname(absolutePath));
        const queueName = deriveQueueName(basename);
        const extracted = extractQueueConfig(call, absolutePath, diagnostics, config.rootDir);

        queues.push({
          exportName: 'default',
          queueName,
          bindingName: deriveBindingName(queueName),
          filePath: path.relative(config.rootDir, absolutePath),
          absoluteFilePath: absolutePath,
          isDefaultExport: true,
          importName: makeImportName(queueName, true, 'default'),
          config: extracted
        });
      }

      project.removeSourceFile(sourceFile);
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
      message: 'No defineQueue exports found in this project.'
    });
  }

  return {
    queues,
    diagnostics
  };
}

function createProject(rootDir: string): Project {
  const tsConfigPath = path.join(rootDir, 'tsconfig.json');
  if (fs.existsSync(tsConfigPath)) {
    return new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true
    });
  }

  return new Project({
    compilerOptions: {
      target: 99,
      module: 99,
      moduleResolution: 99,
      allowJs: false
    }
  });
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

      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(absolutePath, 'utf8');
        if (content.includes('defineQueue')) {
          files.push(absolutePath);
        }
      }
    }
  }

  walk(rootDir);
  return files;
}

function getDefineQueueLocalNames(sourceFile: import('ts-morph').SourceFile): Set<string> {
  const names = new Set<string>();

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const specifier = importDecl.getModuleSpecifierValue();
    if (!specifier.includes('better-cf.config')) {
      continue;
    }

    for (const namedImport of importDecl.getNamedImports()) {
      if (namedImport.getName() !== 'defineQueue') {
        continue;
      }
      names.add(namedImport.getAliasNode()?.getText() ?? namedImport.getName());
    }
  }

  return names;
}

function isDefineQueueCall(call: CallExpression, localNames: Set<string>): boolean {
  const expression = call.getExpression();
  if (expression.getKind() !== SyntaxKind.Identifier) {
    return false;
  }

  return localNames.has(expression.getText());
}

function resolveCallExpressionFromExportAssignment(
  expression: import('ts-morph').Expression
): CallExpression | undefined {
  if (expression.getKind() === SyntaxKind.CallExpression) {
    return expression as CallExpression;
  }

  if (expression.getKind() !== SyntaxKind.Identifier) {
    return undefined;
  }

  const symbol = expression.getSymbol();
  const declaration = symbol?.getValueDeclaration();
  if (!declaration || !Node.isVariableDeclaration(declaration)) {
    return undefined;
  }

  return declaration.getInitializerIfKind(SyntaxKind.CallExpression) ?? undefined;
}

function extractQueueConfig(
  call: CallExpression,
  absolutePath: string,
  diagnostics: DiscoveryDiagnostic[],
  rootDir: string
): ExtractedQueueConfig {
  const firstArg = call.getArguments()[0];
  if (!firstArg || firstArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return {
      hasProcess: false,
      hasProcessBatch: false,
      isMultiJob: false
    };
  }

  const objectLiteral = firstArg as ObjectLiteralExpression;
  const hasProcess = hasProperty(objectLiteral, 'process');
  const hasProcessBatch = hasProperty(objectLiteral, 'processBatch');

  if (hasProcess && hasProcessBatch) {
    diagnostics.push({
      level: 'error',
      code: 'INVALID_PROCESS_MODE',
      message: 'Queue config cannot include both process and processBatch.',
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
  if (!hasProcess && !hasProcessBatch) {
    for (const property of objectLiteral.getProperties()) {
      if (!Node.isPropertyAssignment(property)) {
        continue;
      }

      const propertyName = property.getName();
      if (RESERVED_KEYS.has(propertyName)) {
        continue;
      }

      const initializer = property.getInitializer();
      if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
        continue;
      }

      const jobObject = initializer as ObjectLiteralExpression;
      if (hasProperty(jobObject, 'message') && hasProperty(jobObject, 'process')) {
        isMultiJob = true;
        break;
      }
    }
  }

  const relativeFile = path.relative(rootDir, absolutePath);

  if (consumerType === 'http_pull' && (hasProcess || hasProcessBatch)) {
    diagnostics.push({
      level: 'error',
      code: 'INVALID_PULL_MODE_HANDLER',
      message: 'Queue with consumer.type="http_pull" cannot include process/processBatch.',
      filePath: relativeFile,
      hint: 'Remove process handlers for pull consumers and consume via HTTP pull APIs.'
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
    hasProcess,
    hasProcessBatch,
    isMultiJob
  };
}

function hasProperty(objectLiteral: ObjectLiteralExpression, name: string): boolean {
  return objectLiteral.getProperties().some((property) => {
    return Node.isPropertyAssignment(property) && property.getName() === name;
  });
}

function getObjectLiteralProperty(
  objectLiteral: ObjectLiteralExpression,
  name: string
): ObjectLiteralExpression | undefined {
  for (const property of objectLiteral.getProperties()) {
    if (!Node.isPropertyAssignment(property) || property.getName() !== name) {
      continue;
    }

    const initializer = property.getInitializer();
    if (initializer && initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
      return initializer as ObjectLiteralExpression;
    }
  }

  return undefined;
}

function readNumberProperty(
  objectLiteral: ObjectLiteralExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): number | undefined {
  const prop = objectLiteral.getProperties().find((property) => {
    return Node.isPropertyAssignment(property) && property.getName() === name;
  });
  if (!prop || !Node.isPropertyAssignment(prop)) {
    return undefined;
  }

  const initializer = prop.getInitializer();
  if (!initializer) {
    return undefined;
  }

  if (initializer.getKind() !== SyntaxKind.NumericLiteral) {
    diagnostics.push({
      level: 'warning',
      code: 'NON_STATIC_CONFIG',
      message: `Config key ${name} in ${path.relative(rootDir, absolutePath)} is not a static number literal.`,
      filePath: path.relative(rootDir, absolutePath)
    });
    return undefined;
  }

  return Number(initializer.getText());
}

function readStringProperty(
  objectLiteral: ObjectLiteralExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): string | undefined {
  const prop = objectLiteral.getProperties().find((property) => {
    return Node.isPropertyAssignment(property) && property.getName() === name;
  });
  if (!prop || !Node.isPropertyAssignment(prop)) {
    return undefined;
  }

  const initializer = prop.getInitializer();
  if (!initializer) {
    return undefined;
  }

  if (initializer.getKind() !== SyntaxKind.StringLiteral) {
    diagnostics.push({
      level: 'warning',
      code: 'NON_STATIC_CONFIG',
      message: `Config key ${name} in ${path.relative(rootDir, absolutePath)} is not a static string literal.`,
      filePath: path.relative(rootDir, absolutePath)
    });
    return undefined;
  }

  return initializer.getText().slice(1, -1);
}

function readNumberOrStringProperty(
  objectLiteral: ObjectLiteralExpression,
  name: string,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): number | string | undefined {
  const prop = objectLiteral.getProperties().find((property) => {
    return Node.isPropertyAssignment(property) && property.getName() === name;
  });
  if (!prop || !Node.isPropertyAssignment(prop)) {
    return undefined;
  }

  const initializer = prop.getInitializer();
  if (!initializer) {
    return undefined;
  }

  if (initializer.getKind() === SyntaxKind.NumericLiteral) {
    return Number(initializer.getText());
  }

  if (initializer.getKind() === SyntaxKind.StringLiteral) {
    return initializer.getText().slice(1, -1);
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
  objectLiteral: ObjectLiteralExpression,
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
