import pc from 'picocolors';
import type { DiscoveryDiagnostic } from './types.js';

function printLine(message: string): void {
  process.stdout.write(`${message}\n`);
}

function printErrLine(message: string): void {
  process.stderr.write(`${message}\n`);
}

export const logger = {
  header(title: string): void {
    printLine(pc.bold(pc.cyan(`== ${title} ==`)));
  },
  info(message: string): void {
    printLine(`${pc.blue('[*]')} ${message}`);
  },
  success(message: string): void {
    printLine(`${pc.green('[+]')} ${message}`);
  },
  warn(message: string): void {
    printLine(`${pc.yellow('[!]')} ${message}`);
  },
  error(message: string): void {
    printErrLine(`${pc.red('[x]')} ${message}`);
  },
  section(message: string): void {
    printLine('');
    printLine(pc.bold(pc.white(`-- ${message} --`)));
  },
  item(label: string, value?: string): void {
    printLine(`  -> ${pc.bold(label)}${value ? `: ${value}` : ''}`);
  },
  diagnostic(diag: DiscoveryDiagnostic): void {
    const levelBadge = diag.level === 'error' ? pc.red('[error]') : pc.yellow('[warn]');
    printLine(`${levelBadge} ${pc.bold(diag.code)} ${diag.message}`);
    if (diag.filePath) {
      printLine(`      file: ${diag.filePath}`);
    }
    if (diag.hint) {
      printLine(`      hint: ${diag.hint}`);
    }
  },
  cliError(payload: {
    code: string;
    summary: string;
    file?: string;
    details?: string;
    hint?: string;
    docsUrl?: string;
  }): void {
    printErrLine(pc.red(pc.bold(`\nERROR ${payload.code}`)));
    printErrLine(pc.red(payload.summary));
    if (payload.file) {
      printErrLine(`  file: ${payload.file}`);
    }
    if (payload.details) {
      printErrLine(`  details: ${payload.details}`);
    }
    if (payload.hint) {
      printErrLine(`  hint: ${payload.hint}`);
    }
    if (payload.docsUrl) {
      printErrLine(`  docs: ${payload.docsUrl}`);
    }
  }
};
