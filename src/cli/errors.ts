import type { CliErrorOptions } from './types.js';

export class CliError extends Error {
  readonly code: string;
  readonly summary: string;
  readonly file?: string;
  readonly details?: string;
  readonly hint?: string;
  readonly docsUrl?: string;

  constructor(options: CliErrorOptions) {
    super(options.summary);
    this.name = 'CliError';
    this.code = options.code;
    this.summary = options.summary;
    this.file = options.file;
    this.details = options.details;
    this.hint = options.hint;
    this.docsUrl = options.docsUrl;

    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError({
      code: 'UNEXPECTED_ERROR',
      summary: error.message,
      details: error.stack
    });
  }

  return new CliError({
    code: 'UNEXPECTED_ERROR',
    summary: String(error)
  });
}
