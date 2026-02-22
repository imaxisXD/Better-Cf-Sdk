import { describe, expect, it } from 'vitest';
import { parseDurationSeconds, toCloudflareSendOptions } from '../../src/queue/utils.js';

describe('queue utils', () => {
  it('parses numeric and string durations', () => {
    expect(parseDurationSeconds(5)).toBe(5);
    expect(parseDurationSeconds('15s')).toBe(15);
    expect(parseDurationSeconds('2m')).toBe(120);
    expect(parseDurationSeconds('1h')).toBe(3600);
  });

  it('throws on invalid durations', () => {
    expect(() => parseDurationSeconds(-1)).toThrow('Invalid duration number');
    expect(() => parseDurationSeconds('abc' as never)).toThrow('Invalid duration string');
  });

  it('maps send options to cloudflare format', () => {
    expect(toCloudflareSendOptions(undefined)).toEqual({});
    expect(toCloudflareSendOptions({ delay: '30s' })).toEqual({ delaySeconds: 30 });
    expect(toCloudflareSendOptions({ contentType: 'bytes' })).toEqual({ contentType: 'bytes' });
    expect(toCloudflareSendOptions({ delay: '1m', contentType: 'json' })).toEqual({
      delaySeconds: 60,
      contentType: 'json'
    });
  });
});
