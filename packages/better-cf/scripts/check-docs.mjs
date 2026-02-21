import fs from 'node:fs';
import path from 'node:path';

const packageDir = process.cwd();
const monorepoRoot = path.resolve(packageDir, '..', '..');

const requiredFiles = [
  'README.md',
  'apps/docs/src/content/docs/index.md',
  'apps/docs/src/content/docs/why-better-cf.md',
  'apps/docs/src/content/docs/getting-started.md',
  'apps/docs/src/content/docs/comparison/cloudflare-vs-better-cf.mdx',
  'apps/docs/src/content/docs/examples/cookbook.md',
  'apps/docs/src/content/docs/api/queue.md',
  'apps/docs/src/content/docs/api/testing.md',
  'apps/docs/src/content/docs/guides/automation-cli.md',
  'apps/docs/src/content/docs/guides/env-typing-modes.md',
  'apps/docs/src/content/docs/guides/file-structure.md',
  'apps/docs/src/content/docs/guides/hono.md',
  'apps/docs/src/content/docs/guides/legacy-cloudflare.md',
  'apps/docs/src/content/docs/guides/queue-admin-cli.md',
  'apps/docs/src/content/docs/reference/wrangler-mapping.md',
  'apps/docs/src/content/docs/reference/errors.md',
  'apps/docs/src/content/docs/reference/compatibility.md',
  'apps/docs/src/content/docs/reference/roadmap.md',
  'apps/docs/src/content/docs/limitations.md'
];

const requiredReadmeSections = [
  '## Why better-cf',
  '## Quickstart',
  '## Canonical Imports',
  '## Core Workflow',
  '## Example Patterns',
  '## Comparison with Cloudflare Queue Workflows',
  '## Limitations'
];

for (const file of requiredFiles) {
  const absolutePath = path.join(monorepoRoot, file);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required docs file: ${file}`);
  }
}

const readme = fs.readFileSync(path.join(packageDir, 'README.md'), 'utf8');
for (const section of requiredReadmeSections) {
  if (!readme.includes(section)) {
    throw new Error(`README missing required section: ${section}`);
  }
}

if (readme.includes('npm Publish Runbook') || readme.includes('## npm Publish Runbook')) {
  throw new Error('README contains internal npm publish guidance; remove end-user facing publish runbook text.');
}

console.log('Docs check passed.');
