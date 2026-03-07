import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('README examples', () => {
  it('document the next-gen durable-object surface alongside the legacy queue surface', () => {
    const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');

    expect(readme).toContain('better-cf/durable-object');
    expect(readme).toContain('room.fn({');
    expect(readme).toContain('ctx.api.room.sendMessage');
    expect(readme).toContain('emailQueue.message({');
    expect(readme).toContain('better-cf/queue');
    expect(readme).toContain('Legacy Queue Surface');
  });
});
