import fs from 'node:fs';
import path from 'node:path';
import { Node, Project, SyntaxKind, type ObjectLiteralExpression } from 'ts-morph';
import type { CliConfig } from './types.js';

const DEFAULT_IGNORE = ['node_modules', '.better-cf', 'dist', '.wrangler'];

export function loadCliConfig(rootDir = process.cwd()): CliConfig {
  const defaults: CliConfig = {
    rootDir,
    ignore: [...DEFAULT_IGNORE],
    workerEntry: undefined,
    legacyServiceWorker: false,
    inferEnvTypes: true
  };

  const configPath = path.join(rootDir, 'better-cf.config.ts');
  if (!fs.existsSync(configPath)) {
    return defaults;
  }

  const project = new Project({
    compilerOptions: {
      target: 99,
      module: 99,
      moduleResolution: 99
    }
  });

  const sourceFile = project.addSourceFileAtPath(configPath);
  const variable = sourceFile
    .getVariableDeclarations()
    .find((decl) => decl.getName() === 'betterCfConfig' && decl.getVariableStatement()?.isExported());

  if (!variable) {
    return defaults;
  }

  const initializer = variable.getInitializer();
  if (!initializer || initializer.getKind() !== SyntaxKind.ObjectLiteralExpression) {
    return defaults;
  }

  const configObject = initializer as ObjectLiteralExpression;

  const workerEntry = readString(configObject, 'workerEntry');
  const legacyServiceWorker = readBoolean(configObject, 'legacyServiceWorker');
  const inferEnvTypes = readBoolean(configObject, 'inferEnvTypes');
  const ignore = readStringArray(configObject, 'ignore');

  return {
    rootDir,
    workerEntry,
    legacyServiceWorker: legacyServiceWorker ?? defaults.legacyServiceWorker,
    inferEnvTypes: inferEnvTypes ?? defaults.inferEnvTypes,
    ignore: ignore ? [...new Set([...defaults.ignore, ...ignore])] : defaults.ignore
  };
}

function readString(node: ObjectLiteralExpression, key: string): string | undefined {
  const property = node.getProperties().find((prop) => {
    return Node.isPropertyAssignment(prop) && prop.getName() === key;
  });

  if (!property || !Node.isPropertyAssignment(property)) {
    return undefined;
  }

  const initializer = property.getInitializer();
  if (!initializer || !Node.isStringLiteral(initializer)) {
    return undefined;
  }

  return initializer.getLiteralText();
}

function readBoolean(node: ObjectLiteralExpression, key: string): boolean | undefined {
  const property = node.getProperties().find((prop) => {
    return Node.isPropertyAssignment(prop) && prop.getName() === key;
  });

  if (!property || !Node.isPropertyAssignment(property)) {
    return undefined;
  }

  const initializer = property.getInitializer();
  if (!initializer) {
    return undefined;
  }

  if (initializer.getKind() === SyntaxKind.TrueKeyword) {
    return true;
  }

  if (initializer.getKind() === SyntaxKind.FalseKeyword) {
    return false;
  }

  return undefined;
}

function readStringArray(node: ObjectLiteralExpression, key: string): string[] | undefined {
  const property = node.getProperties().find((prop) => {
    return Node.isPropertyAssignment(prop) && prop.getName() === key;
  });

  if (!property || !Node.isPropertyAssignment(property)) {
    return undefined;
  }

  const initializer = property.getInitializer();
  if (!initializer || !Node.isArrayLiteralExpression(initializer)) {
    return undefined;
  }

  const values = initializer
    .getElements()
    .filter((element): element is import('ts-morph').StringLiteral => Node.isStringLiteral(element))
    .map((element) => element.getLiteralText());

  return values.length > 0 ? values : undefined;
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
