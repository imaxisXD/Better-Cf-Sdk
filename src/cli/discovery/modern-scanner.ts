import fs from 'node:fs';
import path from 'node:path';
import type {
  BindingPattern,
  CallExpression,
  ExportNamedDeclaration,
  Expression,
  ImportDeclaration,
  ObjectExpression,
  ObjectProperty,
  Program,
  VariableDeclaration
} from '@oxc-project/types';
import { parseSync } from 'oxc-parser';
import { deriveBindingName, deriveQueueName } from './naming.js';
import type { ModernDiscoveredDurableObject, ModernDiscoveredDurableRegistration, ModernDiscoveredQueue, ModernDiscoveredQueueConsumer, ModernDiscoveryResult } from '../modern-types.js';
import type { CliConfig, DiscoveryDiagnostic, ExtractedQueueConfig } from '../types.js';

interface ParsedFile {
  absolutePath: string;
  relativePath: string;
  program: Program;
  variableInitMap: Map<string, Expression>;
  sdkVariables: Set<string>;
  imports: Map<string, { absoluteFilePath: string; exportName: string }>;
}

type DeclarationRef =
  | { kind: 'durable'; value: ModernDiscoveredDurableObject }
  | { kind: 'queue'; value: ModernDiscoveredQueue };

const SDK_IMPORT = 'better-cf/durable-object';
const RESERVED_KEYS = new Set([
  'retry',
  'retryDelay',
  'deadLetter',
  'deliveryDelay',
  'visibilityTimeout',
  'batch',
  'consumer',
  'args',
  'description'
]);

export async function scanModernProject(config: CliConfig): Promise<ModernDiscoveryResult> {
  const diagnostics: DiscoveryDiagnostic[] = [];
  const files = collectSourceFiles(config.rootDir, config.ignore);
  const parsedFiles: ParsedFile[] = [];
  const durableObjects: ModernDiscoveredDurableObject[] = [];
  const queues: ModernDiscoveredQueue[] = [];
  const declarations = new Map<string, DeclarationRef>();

  for (const absolutePath of files) {
    const source = fs.readFileSync(absolutePath, 'utf8');
    const hasModernMarker =
      source.includes(SDK_IMPORT) ||
      source.includes('.defineDurableObject(') ||
      source.includes('.defineQueue(') ||
      source.includes('.defineQueues(') ||
      source.includes('.fn(') ||
      source.includes('.message(') ||
      source.includes('.batch(') ||
      source.includes('.websocket(');

    if (!hasModernMarker) {
      continue;
    }

    try {
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
      const variableInitMap = collectVariableInitializers(program);
      const parsedFile: ParsedFile = {
        absolutePath,
        relativePath: path.relative(config.rootDir, absolutePath),
        program,
        variableInitMap,
        sdkVariables: getSdkVariableNames(program, variableInitMap),
        imports: collectImports(program, absolutePath)
      };
      parsedFiles.push(parsedFile);
    } catch (error) {
      diagnostics.push({
        level: 'error',
        code: 'SCANNER_FILE_ERROR',
        message: `Failed to parse ${absolutePath}: ${toErrorMessage(error)}`,
        filePath: path.relative(config.rootDir, absolutePath)
      });
    }
  }

  const sdkExportRefs = collectExportedSdkRefs(parsedFiles);

  for (const parsedFile of parsedFiles) {
    discoverDefinitions(parsedFile, config.rootDir, durableObjects, queues, declarations, diagnostics, sdkExportRefs);
  }

  const durableRegistrations: ModernDiscoveredDurableRegistration[] = [];
  const queueConsumers: ModernDiscoveredQueueConsumer[] = [];

  for (const parsedFile of parsedFiles) {
    discoverRegistrations(parsedFile, config.rootDir, declarations, durableRegistrations, queueConsumers, diagnostics);
  }

  addModernConflicts(durableObjects, durableRegistrations, queues, queueConsumers, diagnostics);

  return {
    hasModernSurface:
      durableObjects.length > 0 ||
      durableRegistrations.length > 0 ||
      queues.length > 0 ||
      queueConsumers.length > 0,
    durableObjects,
    durableRegistrations,
    queues,
    queueConsumers,
    diagnostics
  };
}

function discoverDefinitions(
  parsedFile: ParsedFile,
  rootDir: string,
  durableObjects: ModernDiscoveredDurableObject[],
  queues: ModernDiscoveredQueue[],
  declarations: Map<string, DeclarationRef>,
  diagnostics: DiscoveryDiagnostic[],
  sdkExportRefs: Set<string>
): void {
  for (const statement of parsedFile.program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || !statement.declaration || statement.declaration.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declaration of statement.declaration.declarations) {
      const exportName = getBindingName(declaration.id);
      if (!exportName || !declaration.init) {
        continue;
      }

      const call = resolveCallExpressionFromExpression(declaration.init, parsedFile.variableInitMap);
      if (!call) {
        continue;
      }

      const chain = getMemberChain(call.callee);
      if (!chain || chain.length !== 2 || !isSdkVariableReference(parsedFile, chain[0], sdkExportRefs)) {
        continue;
      }

      if (chain[1] === 'defineDurableObject') {
        const firstArg = call.arguments[0];
        if (!firstArg || firstArg.type !== 'ObjectExpression') {
          diagnostics.push({
            level: 'warning',
            code: 'NON_STATIC_CONFIG',
            message: `Durable object declaration ${exportName} must use a literal object config.`,
            filePath: parsedFile.relativePath
          });
          continue;
        }

        const objectName = readStringProperty(firstArg, 'name', diagnostics, parsedFile.absolutePath, rootDir) ?? exportName;
        const description = readStringProperty(firstArg, 'description', diagnostics, parsedFile.absolutePath, rootDir);
        const version = readNumberProperty(firstArg, 'version', diagnostics, parsedFile.absolutePath, rootDir);
        const discovered: ModernDiscoveredDurableObject = {
          id: `${parsedFile.absolutePath}#${exportName}`,
          exportName,
          filePath: parsedFile.relativePath,
          absoluteFilePath: parsedFile.absolutePath,
          description,
          objectName,
          bindingName: deriveDurableBindingName(objectName),
          className: objectName,
          version
        };
        durableObjects.push(discovered);
        declarations.set(discovered.id, { kind: 'durable', value: discovered });
        continue;
      }

      if (chain[1] === 'defineQueue' || chain[1] === 'defineQueues') {
        const firstArg = call.arguments[0];
        if (!firstArg || firstArg.type !== 'ObjectExpression') {
          diagnostics.push({
            level: 'warning',
            code: 'NON_STATIC_CONFIG',
            message: `Queue declaration ${exportName} must use a literal object config.`,
            filePath: parsedFile.relativePath
          });
          continue;
        }

        const queueName = deriveQueueName(exportName);
        const discovered: ModernDiscoveredQueue = {
          id: `${parsedFile.absolutePath}#${exportName}`,
          exportName,
          filePath: parsedFile.relativePath,
          absoluteFilePath: parsedFile.absolutePath,
          description: readStringProperty(firstArg, 'description', diagnostics, parsedFile.absolutePath, rootDir),
          kind: chain[1] === 'defineQueues' ? 'multi' : 'single',
          queueName,
          bindingName: deriveBindingName(queueName),
          config: extractModernQueueConfig(firstArg, chain[1] === 'defineQueues', diagnostics, parsedFile.absolutePath, rootDir),
          jobNames: chain[1] === 'defineQueues' ? readQueueJobNames(firstArg) : []
        };
        queues.push(discovered);
        declarations.set(discovered.id, { kind: 'queue', value: discovered });
      }
    }
  }
}

function collectExportedSdkRefs(parsedFiles: ParsedFile[]): Set<string> {
  const refs = new Set<string>();

  for (const parsedFile of parsedFiles) {
    for (const statement of parsedFile.program.body) {
      if (statement.type === 'ExportNamedDeclaration') {
        if (statement.declaration?.type === 'VariableDeclaration') {
          for (const declaration of statement.declaration.declarations) {
            const name = getBindingName(declaration.id);
            if (name && parsedFile.sdkVariables.has(name)) {
              refs.add(`${parsedFile.absolutePath}#${name}`);
            }
          }
        }

        for (const specifier of statement.specifiers) {
          if (specifier.type !== 'ExportSpecifier' || specifier.local.type !== 'Identifier') {
            continue;
          }

          if (!parsedFile.sdkVariables.has(specifier.local.name)) {
            continue;
          }

          const exportName = getModuleExportName(specifier.exported) ?? specifier.local.name;
          refs.add(`${parsedFile.absolutePath}#${exportName}`);
        }
      }
    }
  }

  return refs;
}

function isSdkVariableReference(parsedFile: ParsedFile, localName: string, sdkExportRefs: Set<string>): boolean {
  if (parsedFile.sdkVariables.has(localName)) {
    return true;
  }

  const imported = parsedFile.imports.get(localName);
  if (!imported) {
    return false;
  }

  return sdkExportRefs.has(`${imported.absoluteFilePath}#${imported.exportName}`);
}

function discoverRegistrations(
  parsedFile: ParsedFile,
  rootDir: string,
  declarations: Map<string, DeclarationRef>,
  durableRegistrations: ModernDiscoveredDurableRegistration[],
  queueConsumers: ModernDiscoveredQueueConsumer[],
  diagnostics: DiscoveryDiagnostic[]
): void {
  const localDeclarations = buildLocalDeclarationLookup(parsedFile, declarations);

  for (const statement of parsedFile.program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || !statement.declaration || statement.declaration.type !== 'VariableDeclaration') {
      continue;
    }

    for (const declaration of statement.declaration.declarations) {
      const exportName = getBindingName(declaration.id);
      if (!exportName || !declaration.init) {
        continue;
      }

      const call = resolveCallExpressionFromExpression(declaration.init, parsedFile.variableInitMap);
      if (!call) {
        continue;
      }

      const chain = getMemberChain(call.callee);
      if (!chain || chain.length < 2) {
        continue;
      }

      const owner = localDeclarations.get(chain[0]);
      if (!owner) {
        continue;
      }

      if (owner.kind === 'durable') {
        const hook = chain[1];
        if (!['fn', 'internal', 'fetch', 'alarm', 'init', 'websocket'].includes(hook)) {
          continue;
        }

        durableRegistrations.push({
          id: `${parsedFile.absolutePath}#${exportName}`,
          exportName,
          filePath: parsedFile.relativePath,
          absoluteFilePath: parsedFile.absolutePath,
          description: readRegistrationDescription(getFirstExpressionArgument(call), diagnostics, parsedFile.absolutePath, rootDir),
          ownerId: owner.value.id,
          ownerExportName: owner.value.exportName,
          kind: hook as ModernDiscoveredDurableRegistration['kind']
        });
        continue;
      }

      if (owner.kind !== 'queue') {
        continue;
      }

      if (chain.length === 2 && (chain[1] === 'message' || chain[1] === 'batch')) {
        queueConsumers.push({
          id: `${parsedFile.absolutePath}#${exportName}`,
          exportName,
          filePath: parsedFile.relativePath,
          absoluteFilePath: parsedFile.absolutePath,
          description: readRegistrationDescription(getFirstExpressionArgument(call), diagnostics, parsedFile.absolutePath, rootDir),
          ownerId: owner.value.id,
          ownerExportName: owner.value.exportName,
          kind: chain[1]
        });
        continue;
      }

      if (chain.length === 3 && owner.value.kind === 'multi' && chain[2] === 'message') {
        queueConsumers.push({
          id: `${parsedFile.absolutePath}#${exportName}`,
          exportName,
          filePath: parsedFile.relativePath,
          absoluteFilePath: parsedFile.absolutePath,
          description: readRegistrationDescription(getFirstExpressionArgument(call), diagnostics, parsedFile.absolutePath, rootDir),
          ownerId: owner.value.id,
          ownerExportName: owner.value.exportName,
          kind: 'job-message',
          jobName: chain[1]
        });
      }
    }
  }
}

function buildLocalDeclarationLookup(parsedFile: ParsedFile, declarations: Map<string, DeclarationRef>) {
  const map = new Map<string, DeclarationRef>();

  for (const declaration of declarations.values()) {
    if (declaration.value.absoluteFilePath === parsedFile.absolutePath) {
      map.set(declaration.value.exportName, declaration);
    }
  }

  for (const [localName, imported] of parsedFile.imports.entries()) {
    const ref = declarations.get(`${imported.absoluteFilePath}#${imported.exportName}`);
    if (ref) {
      map.set(localName, ref);
    }
  }

  return map;
}

function addModernConflicts(
  durableObjects: ModernDiscoveredDurableObject[],
  durableRegistrations: ModernDiscoveredDurableRegistration[],
  queues: ModernDiscoveredQueue[],
  queueConsumers: ModernDiscoveredQueueConsumer[],
  diagnostics: DiscoveryDiagnostic[]
): void {
  const objectNameMap = new Map<string, string[]>();
  const objectBindingMap = new Map<string, string[]>();

  for (const durableObject of durableObjects) {
    objectNameMap.set(durableObject.objectName, [...(objectNameMap.get(durableObject.objectName) ?? []), durableObject.filePath]);
    objectBindingMap.set(
      durableObject.bindingName,
      [...(objectBindingMap.get(durableObject.bindingName) ?? []), durableObject.filePath]
    );
  }

  for (const [name, files] of objectNameMap.entries()) {
    if (files.length > 1) {
      diagnostics.push({
        level: 'error',
        code: 'DURABLE_OBJECT_NAME_CONFLICT',
        message: `Durable object name conflict for ${name}: ${files.join(', ')}`
      });
    }
  }

  for (const [name, files] of objectBindingMap.entries()) {
    if (files.length > 1) {
      diagnostics.push({
        level: 'error',
        code: 'DURABLE_OBJECT_BINDING_CONFLICT',
        message: `Durable object binding conflict for ${name}: ${files.join(', ')}`
      });
    }
  }

  const queueNameMap = new Map<string, string[]>();
  const bindingNameMap = new Map<string, string[]>();

  for (const queue of queues) {
    queueNameMap.set(queue.queueName, [...(queueNameMap.get(queue.queueName) ?? []), queue.filePath]);
    bindingNameMap.set(queue.bindingName, [...(bindingNameMap.get(queue.bindingName) ?? []), queue.filePath]);
  }

  for (const [queueName, files] of queueNameMap.entries()) {
    if (files.length > 1) {
      diagnostics.push({
        level: 'error',
        code: 'QUEUE_NAME_CONFLICT',
        message: `Queue name conflict for ${queueName}: ${files.join(', ')}`
      });
    }
  }

  for (const [bindingName, files] of bindingNameMap.entries()) {
    if (files.length > 1) {
      diagnostics.push({
        level: 'error',
        code: 'BINDING_NAME_CONFLICT',
        message: `Binding name conflict for ${bindingName}: ${files.join(', ')}`
      });
    }
  }

  const durableHookCounts = new Map<string, number>();
  for (const registration of durableRegistrations) {
    if (registration.kind === 'fn' || registration.kind === 'internal') {
      continue;
    }
    const key = `${registration.ownerId}:${registration.kind}`;
    const next = (durableHookCounts.get(key) ?? 0) + 1;
    durableHookCounts.set(key, next);
    if (next > 1) {
      diagnostics.push({
        level: 'error',
        code: 'DURABLE_OBJECT_HOOK_CONFLICT',
        message: `Durable object ${registration.ownerExportName} has multiple ${registration.kind} registrations.`
      });
    }
  }

  const queueConsumerCounts = new Map<string, number>();
  for (const consumer of queueConsumers) {
    const key = consumer.kind === 'job-message' ? `${consumer.ownerId}:${consumer.jobName}` : consumer.ownerId;
    const next = (queueConsumerCounts.get(key) ?? 0) + 1;
    queueConsumerCounts.set(key, next);
    if (next > 1) {
      diagnostics.push({
        level: 'error',
        code: 'QUEUE_CONSUMER_CONFLICT',
        message:
          consumer.kind === 'job-message'
            ? `Queue job ${consumer.ownerExportName}.${consumer.jobName} has multiple consumer registrations.`
            : `Queue ${consumer.ownerExportName} has multiple consumer registrations.`
      });
    }
  }
}

function collectSourceFiles(rootDir: string, ignore: string[]): string[] {
  const files: string[] = [];
  const ignoreSet = new Set(ignore);

  function walk(currentPath: string): void {
    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      if (entry.name.startsWith('.git') || ignoreSet.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(absolutePath);
      }
    }
  }

  walk(rootDir);
  return files;
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

function getSdkVariableNames(program: Program, variableInitMap: Map<string, Expression>): Set<string> {
  const createSdkNames = new Set<string>();
  const sdkVariables = new Set<string>();

  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.source.value !== SDK_IMPORT) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier') {
        continue;
      }
      if (getModuleExportName(specifier.imported) === 'createSDK') {
        createSdkNames.add(specifier.local.name);
      }
    }
  }

  for (const [name, initializer] of variableInitMap.entries()) {
    const call = resolveCallExpressionFromExpression(initializer, variableInitMap);
    if (!call) {
      continue;
    }

    const callee = unwrapExpression(call.callee);
    if (callee.type === 'Identifier' && createSdkNames.has(callee.name)) {
      sdkVariables.add(name);
    }
  }

  return sdkVariables;
}

function collectImports(program: Program, absolutePath: string) {
  const imports = new Map<string, { absoluteFilePath: string; exportName: string }>();

  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration') {
      continue;
    }
    collectImportDeclaration(imports, statement, absolutePath);
  }

  return imports;
}

function collectImportDeclaration(
  imports: Map<string, { absoluteFilePath: string; exportName: string }>,
  statement: ImportDeclaration,
  absolutePath: string
) {
  if (!statement.source.value.startsWith('.')) {
    return;
  }

  const resolved = resolveImportPath(absolutePath, statement.source.value);
  if (!resolved) {
    return;
  }

  for (const specifier of statement.specifiers) {
    if (specifier.type !== 'ImportSpecifier') {
      continue;
    }

    const exportName = getModuleExportName(specifier.imported);
    if (!exportName) {
      continue;
    }

    imports.set(specifier.local.name, {
      absoluteFilePath: resolved,
      exportName
    });
  }
}

function resolveImportPath(fromFile: string, importPath: string): string | undefined {
  const basePath = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx')
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
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

function getMemberChain(expression: Expression): string[] | undefined {
  const unwrapped = unwrapExpression(expression);
  if (unwrapped.type === 'Identifier') {
    return [unwrapped.name];
  }

  if (unwrapped.type !== 'MemberExpression' || unwrapped.computed) {
    return undefined;
  }

  const objectChain = getMemberChain(unwrapped.object);
  if (!objectChain || unwrapped.property.type !== 'Identifier') {
    return undefined;
  }

  return [...objectChain, unwrapped.property.name];
}

function getBindingName(binding: BindingPattern): string | undefined {
  return binding.type === 'Identifier' ? binding.name : undefined;
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

function extractModernQueueConfig(
  objectLiteral: ObjectExpression,
  isMultiJob: boolean,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): ExtractedQueueConfig {
  const consumer = readConsumerConfig(objectLiteral, diagnostics, absolutePath, rootDir);
  const batchObject = getObjectLiteralProperty(objectLiteral, 'batch');

  return {
    retry: readNumberProperty(objectLiteral, 'retry', diagnostics, absolutePath, rootDir),
    retryDelay: readNumberOrStringProperty(objectLiteral, 'retryDelay', diagnostics, absolutePath, rootDir),
    deadLetter: readStringProperty(objectLiteral, 'deadLetter', diagnostics, absolutePath, rootDir),
    deliveryDelay: readNumberOrStringProperty(objectLiteral, 'deliveryDelay', diagnostics, absolutePath, rootDir),
    batchMaxSize: batchObject
      ? readNumberProperty(batchObject, 'maxSize', diagnostics, absolutePath, rootDir)
      : undefined,
    batchTimeout: batchObject
      ? readNumberOrStringProperty(batchObject, 'timeout', diagnostics, absolutePath, rootDir)
      : undefined,
    maxConcurrency: batchObject
      ? readNumberProperty(batchObject, 'maxConcurrency', diagnostics, absolutePath, rootDir)
      : undefined,
    visibilityTimeout:
      consumer?.visibilityTimeout ??
      readNumberOrStringProperty(objectLiteral, 'visibilityTimeout', diagnostics, absolutePath, rootDir),
    consumerType: consumer?.type,
    hasHandler: false,
    hasBatchHandler: false,
    isMultiJob
  };
}

function readQueueJobNames(objectLiteral: ObjectExpression): string[] {
  const names: string[] = [];
  for (const property of objectLiteral.properties) {
    if (property.type !== 'Property') {
      continue;
    }
    const propertyName = getPropertyName(property);
    if (!propertyName || RESERVED_KEYS.has(propertyName)) {
      continue;
    }
    names.push(propertyName);
  }
  return names;
}

function readRegistrationDescription(
  firstArg: Expression | undefined,
  diagnostics: DiscoveryDiagnostic[],
  absolutePath: string,
  rootDir: string
): string | undefined {
  if (!firstArg || firstArg.type !== 'ObjectExpression') {
    return undefined;
  }

  return readStringProperty(firstArg, 'description', diagnostics, absolutePath, rootDir);
}

function getFirstExpressionArgument(call: CallExpression): Expression | undefined {
  const value = call.arguments[0];
  return value && value.type !== 'SpreadElement' ? value : undefined;
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
    return undefined;
  }

  return {
    type: typeValue,
    visibilityTimeout: readNumberOrStringProperty(consumerObject, 'visibilityTimeout', diagnostics, absolutePath, rootDir)
  };
}

function getObjectLiteralProperty(objectLiteral: ObjectExpression, name: string): ObjectExpression | undefined {
  const initializer = getPropertyInitializer(objectLiteral, name);
  if (!initializer || initializer.type !== 'ObjectExpression') {
    return undefined;
  }
  return initializer;
}

function getPropertyInitializer(objectLiteral: ObjectExpression, name: string): Expression | undefined {
  for (const property of objectLiteral.properties) {
    if (property.type === 'Property' && getPropertyName(property) === name) {
      return unwrapExpression(property.value);
    }
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

function deriveDurableBindingName(objectName: string): string {
  return `DO_${objectName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toUpperCase()}`;
}

function toErrorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}
