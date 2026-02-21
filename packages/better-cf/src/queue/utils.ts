import type { Duration, SendOptions } from './types.js';

export function parseDurationSeconds(value: Duration): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid duration number: ${value}`);
    }
    return value;
  }

  const match = value.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    throw new Error(`Invalid duration string: ${value}`);
  }

  const numberValue = Number.parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 's') {
    return numberValue;
  }

  if (unit === 'm') {
    return numberValue * 60;
  }

  return numberValue * 3600;
}

export function mergeSendOptions(entry?: SendOptions, batch?: SendOptions): SendOptions | undefined {
  if (!entry && !batch) {
    return undefined;
  }

  return {
    delay: entry?.delay ?? batch?.delay,
    contentType: entry?.contentType ?? batch?.contentType
  };
}

export function toCloudflareSendOptions(options: SendOptions | undefined): {
  delaySeconds?: number;
  contentType?: SendOptions['contentType'];
} {
  if (!options) {
    return {};
  }

  const result: { delaySeconds?: number; contentType?: SendOptions['contentType'] } = {};

  if (options.delay !== undefined) {
    result.delaySeconds = parseDurationSeconds(options.delay);
  }

  if (options.contentType !== undefined) {
    result.contentType = options.contentType;
  }

  return result;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
