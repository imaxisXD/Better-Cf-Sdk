import { spawn } from 'node:child_process';

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
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio,
      env: process.env
    });

    child.once('error', (error) => reject(error));
    child.once('close', (code) => resolve(code ?? 0));
  });
}

export function runCommandCapture(command: string, args: string[], cwd: string): Promise<CommandOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      env: process.env
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.once('error', (error) => reject(error));
    child.once('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr
      });
    });
  });
}

export function spawnCommand(command: string, args: string[], cwd: string) {
  return spawn(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env
  });
}
