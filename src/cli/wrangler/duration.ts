import { CliError } from '../errors.js';

export function parseDurationSecondsStrict(value: string | number, context: string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new CliError({
        code: 'INVALID_DURATION',
        summary: `Invalid duration for ${context}.`,
        details: `Expected non-negative finite number, received ${String(value)}.`,
        hint: 'Use values like 30 or "30s", "5m", "1h".'
      });
    }
    return value;
  }

  const match = value.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new CliError({
      code: 'INVALID_DURATION',
      summary: `Invalid duration string for ${context}.`,
      details: `Received "${value}".`,
      hint: 'Use formats like "30s", "5m", "1h".'
    });
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') {
    return amount;
  }

  if (unit === 'm') {
    return amount * 60;
  }

  return amount * 3600;
}

export function parseDurationMsStrict(value: string | number, context: string): number {
  return parseDurationSecondsStrict(value, context) * 1000;
}
