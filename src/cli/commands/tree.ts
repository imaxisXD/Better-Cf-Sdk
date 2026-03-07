import fs from 'node:fs/promises';
import path from 'node:path';
import { CliError } from '../errors.js';
import { runCommandCapture } from '../process.js';

export interface TreeCommandOptions {
  depth?: number;
  ignore?: string[];
  json?: boolean;
}

interface TreeNode {
  name: string;
  absolutePath: string;
  kind: 'file' | 'directory';
  children: TreeNode[];
}

export async function treeCommand(
  maybePath: string | undefined,
  options: TreeCommandOptions = {},
  rootDir = process.cwd()
): Promise<void> {
  const targetPath = path.resolve(rootDir, maybePath ?? '.');
  await assertTargetExists(targetPath);

  const usedSystemTree = await renderWithSystemTree(targetPath, options, rootDir);
  if (usedSystemTree) {
    return;
  }

  const node = await buildTree(targetPath, {
    depth: options.depth,
    ignore: new Set(options.ignore ?? [])
  });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(node, null, 2)}\n`);
    return;
  }

  const lines = renderTree(node);
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function renderWithSystemTree(
  targetPath: string,
  options: TreeCommandOptions,
  rootDir: string
): Promise<boolean> {
  const args: string[] = [];

  if (options.json) {
    args.push('-J');
  }
  if (options.depth !== undefined) {
    args.push('-L', String(options.depth));
  }
  const ignorePatterns = options.ignore?.filter((entry) => entry.length > 0) ?? [];
  if (ignorePatterns.length > 0) {
    args.push('-I', ignorePatterns.join('|'));
  }
  args.push(targetPath);

  try {
    const result = await runCommandCapture('tree', args, rootDir);
    if (result.code !== 0) {
      return false;
    }

    const output = result.stdout.trimEnd();
    process.stdout.write(output.length > 0 ? `${output}\n` : '\n');
    return true;
  } catch {
    return false;
  }
}

async function assertTargetExists(targetPath: string): Promise<void> {
  try {
    await fs.access(targetPath);
  } catch {
    throw new CliError({
      code: 'TREE_TARGET_NOT_FOUND',
      summary: `Tree target path does not exist: ${targetPath}.`,
      hint: 'Pass a valid file or directory path.'
    });
  }
}

async function buildTree(
  absolutePath: string,
  options: {
    depth?: number;
    ignore: Set<string>;
  },
  currentDepth = 0
): Promise<TreeNode> {
  const stats = await fs.lstat(absolutePath);
  const node: TreeNode = {
    name: path.basename(absolutePath) || absolutePath,
    absolutePath,
    kind: stats.isDirectory() ? 'directory' : 'file',
    children: []
  };

  if (!stats.isDirectory()) {
    return node;
  }

  if (options.depth !== undefined && currentDepth >= options.depth) {
    return node;
  }

  const entries = await fs.readdir(absolutePath, { withFileTypes: true });
  const filtered = entries
    .filter((entry) => !options.ignore.has(entry.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) {
        return -1;
      }
      if (!a.isDirectory() && b.isDirectory()) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

  for (const entry of filtered) {
    const childPath = path.join(absolutePath, entry.name);
    node.children.push(await buildTree(childPath, options, currentDepth + 1));
  }

  return node;
}

function renderTree(root: TreeNode): string[] {
  const lines = [root.name];
  walkChildren(root.children, '', lines);
  return lines;
}

function walkChildren(children: TreeNode[], prefix: string, lines: string[]): void {
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const isLast = index === children.length - 1;
    lines.push(`${prefix}${isLast ? '\\-- ' : '+-- '}${child.name}`);
    if (child.children.length > 0) {
      walkChildren(child.children, `${prefix}${isLast ? '    ' : '|   '}`, lines);
    }
  }
}
