import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runGenerate } from '../../src/cli/commands/generate.js';
import { copyDir, makeTempDir } from '../helpers/fs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

describe('modern durable-object e2e flow', () => {
  it('generates durable objects, ctx.api bindings, and wrangler sqlite migrations', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-e2e-');
    copyDir(fixture, temp);

    const result = await runGenerate(temp);

    expect(result.modernDiscovery?.durableObjects).toHaveLength(1);
    expect(result.modernDiscovery?.queues).toHaveLength(2);

    const entry = fs.readFileSync(result.generatedEntryPath, 'utf8');
    const types = fs.readFileSync(result.generatedTypesPath, 'utf8');
    const wrangler = fs.readFileSync(result.wranglerConfigPath, 'utf8');
    const autoEnv = fs.readFileSync(result.autoEnvPath, 'utf8');
    const migrationState = fs.readFileSync(path.join(temp, '.better-cf/durable-migrations.json'), 'utf8');

    expect(entry).toContain('setGeneratedApiFactory');
    expect(entry).toContain('async sendMessage(key, args)');
    expect(entry).toContain('$internal');
    expect(entry).toContain('invokeDurableWebSocketConnect');
    expect(entry).toContain('export class Room');

    expect(types).toContain("declare module 'better-cf/durable-object'");
    expect(types).toContain('DO_ROOM: DurableObjectNamespace;');
    expect(types).toContain('QUEUE_EMAIL: Queue;');
    expect(types).toContain('/** Append a room message. */');
    expect(types).toContain('/** Email fanout queue. */');
    expect(types).toContain('$raw: {');
    expect(types).toContain('sendMessage(key: DurableFnKey');

    expect(wrangler).toContain('main = ".better-cf/entry.ts"');
    expect(wrangler).toContain('[[durable_objects.bindings]]');
    expect(wrangler).toContain('name = "DO_ROOM"');
    expect(wrangler).toContain('class_name = "Room"');
    expect(wrangler).toContain('[[migrations]]');
    expect(wrangler).toContain('new_sqlite_classes = ["Room"]');
    expect(wrangler).toContain('[[queues.producers]]');
    expect(wrangler).toContain('queue = "email"');
    expect(wrangler).toContain('[[queues.consumers]]');

    expect(autoEnv).toContain('/// <reference path="./types.d.ts" />');
    expect(JSON.parse(migrationState)).toMatchObject({
      version: 1,
      knownClasses: ['Room']
    });
  });

  it('is idempotent across repeated modern generation runs', async () => {
    const fixture = path.join(repoRoot, 'fixtures/e2e/nextgen-room');
    const temp = makeTempDir('better-cf-modern-idempotent-');
    copyDir(fixture, temp);

    const first = await runGenerate(temp);
    const firstEntry = fs.readFileSync(first.generatedEntryPath, 'utf8');
    const firstTypes = fs.readFileSync(first.generatedTypesPath, 'utf8');
    const firstWrangler = fs.readFileSync(first.wranglerConfigPath, 'utf8');

    const second = await runGenerate(temp);
    const secondEntry = fs.readFileSync(second.generatedEntryPath, 'utf8');
    const secondTypes = fs.readFileSync(second.generatedTypesPath, 'utf8');
    const secondWrangler = fs.readFileSync(second.wranglerConfigPath, 'utf8');

    expect(secondEntry).toBe(firstEntry);
    expect(secondTypes).toBe(firstTypes);
    expect(secondWrangler).toBe(firstWrangler);
  });
});
