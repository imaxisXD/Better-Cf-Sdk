import { beforeEach, describe, expect, it, vi } from 'vitest';

const registryListCommandMock = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('../../src/cli/commands/registry.js', () => ({
  registryAddCommand: vi.fn(async () => {}),
  registryCacheClearCommand: vi.fn(async () => {}),
  registryInfoCommand: vi.fn(async () => {}),
  registryListCommand: registryListCommandMock
}));

import { run } from '../../src/cli/index.js';

describe('cli command surface', () => {
  beforeEach(() => {
    process.exitCode = undefined;
    registryListCommandMock.mockReset();
  });

  it('supports nested registry subcommands', async () => {
    await run(['registry', 'list']);

    expect(registryListCommandMock).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('rejects removed colon-style commands', async () => {
    await run(['queue:list']);

    expect(process.exitCode).toBe(1);
  });
});
