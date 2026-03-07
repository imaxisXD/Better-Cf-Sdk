import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTempDir } from '../helpers/fs.js';

const runCommandCaptureMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/cli/process.js', () => ({
  runCommandCapture: runCommandCaptureMock
}));

import { treeCommand } from '../../src/cli/commands/tree.js';

describe('tree command', () => {
  beforeEach(() => {
    runCommandCaptureMock.mockReset();
    runCommandCaptureMock.mockRejectedValue(new Error('tree command unavailable'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to internal renderer for text output', async () => {
    const temp = makeTempDir('better-cf-tree-');
    fs.mkdirSync(path.join(temp, 'src'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'src/index.ts'), 'export {};\n', 'utf8');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await treeCommand('.', { depth: 3, json: false }, temp);

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain(path.basename(temp));
    expect(output).toContain('\\-- src');
    expect(output).toContain('\\-- index.ts');
  });

  it('supports fallback JSON output with ignore list', async () => {
    const temp = makeTempDir('better-cf-tree-json-');
    fs.mkdirSync(path.join(temp, 'keep'), { recursive: true });
    fs.mkdirSync(path.join(temp, 'ignore-me'), { recursive: true });
    fs.writeFileSync(path.join(temp, 'keep/file.txt'), 'hello\n', 'utf8');

    const writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await treeCommand('.', { json: true, ignore: ['ignore-me'] }, temp);

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('').trim();
    const tree = JSON.parse(output) as { children: Array<{ name: string }> };
    const names = tree.children.map((entry) => entry.name);

    expect(names).toContain('keep');
    expect(names).not.toContain('ignore-me');
  });
});
