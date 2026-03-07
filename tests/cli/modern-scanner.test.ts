import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadCliConfig } from '../../src/cli/config.js';
import { scanModernProject } from '../../src/cli/discovery/modern-scanner.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('modern durable-object scanner', () => {
  it('discovers durable objects, queue builders, and external consumers', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-scan-');
    copyDir(fixture, temp);

    const result = await scanModernProject(loadCliConfig(temp));

    expect(result.hasModernSurface).toBe(true);
    expect(result.durableObjects).toHaveLength(1);
    expect(result.durableObjects[0]).toMatchObject({
      exportName: 'room',
      objectName: 'Room',
      bindingName: 'DO_ROOM'
    });
    expect(result.queues.map((queue) => queue.exportName).sort()).toEqual(['emailQueue', 'jobs']);
    expect(result.durableRegistrations.map((registration) => registration.kind).sort()).toEqual([
      'alarm',
      'fetch',
      'fn',
      'init',
      'internal',
      'websocket'
    ]);
    expect(result.queueConsumers.map((consumer) => consumer.exportName).sort()).toEqual([
      'emailJobConsumer',
      'emailQueueConsumer'
    ]);
    expect(result.diagnostics.filter((diag) => diag.level === 'error')).toHaveLength(0);
  });

  it('reports duplicate durable lifecycle registrations', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-hook-conflict-');
    copyDir(fixture, temp);

    fs.appendFileSync(
      path.join(temp, 'src/room.ts'),
      `

export const extraFetch = room.fetch({
  handler: async () => new Response('extra')
});
`,
      'utf8'
    );

    const result = await scanModernProject(loadCliConfig(temp));
    const conflict = result.diagnostics.find((diag) => diag.code === 'DURABLE_OBJECT_HOOK_CONFLICT');

    expect(conflict).toBeDefined();
    expect(conflict?.message).toContain('multiple fetch registrations');
  });

  it('reports duplicate queue consumer registrations', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-consumer-conflict-');
    copyDir(fixture, temp);

    fs.writeFileSync(
      path.join(temp, 'src/email-queue-extra.ts'),
      `import { emailQueue } from './schema';

export const duplicateConsumer = emailQueue.message({
  handler: async () => {
    return;
  }
});
`,
      'utf8'
    );

    const result = await scanModernProject(loadCliConfig(temp));
    const conflict = result.diagnostics.find((diag) => diag.code === 'QUEUE_CONSUMER_CONFLICT');

    expect(conflict).toBeDefined();
    expect(conflict?.message).toContain('multiple consumer registrations');
  });
});
