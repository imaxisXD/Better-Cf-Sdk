import type { StdioOptions } from 'node:child_process';
import { x } from 'tinyexec';

export interface CommandOutput {
  code: number;
  stdout: string;
  stderr: string;
}

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  stdio: 'inherit' | 'pipe' = 'inherit'
): Promise<number> {
  return Promise.resolve(
    x(command, args, {
      throwOnError: false,
      nodeOptions: {
        cwd,
        stdio: toStdioOption(stdio),
        env: process.env
      }
    })
  ).then((result) => result.exitCode ?? 0);
}

export function runCommandCapture(command: string, args: string[], cwd: string): Promise<CommandOutput> {
  return Promise.resolve(
    x(command, args, {
      throwOnError: false,
      nodeOptions: {
        cwd,
        stdio: 'pipe',
        env: process.env
      }
    })
  ).then((result) => ({
    code: result.exitCode ?? 0,
    stdout: result.stdout,
    stderr: result.stderr
  }));
}

export function spawnCommand(command: string, args: string[], cwd: string) {
  return x(command, args, {
    throwOnError: false,
    persist: true,
    nodeOptions: {
      cwd,
      stdio: 'inherit',
      env: process.env
    }
  });
}

function toStdioOption(mode: 'inherit' | 'pipe'): StdioOptions {
  return mode;
}
