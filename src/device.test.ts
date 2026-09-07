import { describe, expect, it } from 'vitest';
import { classifyDevice, type DeviceEnv } from './device';

const base: DeviceEnv = { override: null, coarsePointer: false, hasTouch: false, ua: '' };

describe('classifyDevice', () => {
  it('honours an explicit phone override', () => {
    expect(classifyDevice({ ...base, override: 'phone', ua: 'Mozilla/5.0 (Windows NT)' })).toBe('phone');
  });

  it('honours an explicit desktop override even on a phone UA', () => {
    expect(classifyDevice({ ...base, override: 'desktop', ua: 'iPhone', coarsePointer: true, hasTouch: true })).toBe('desktop');
  });

  it('ignores an unknown override value', () => {
    expect(classifyDevice({ ...base, override: 'watch', coarsePointer: true, hasTouch: true, ua: 'Android' })).toBe('phone');
  });

  it('treats a mobile user-agent as a phone', () => {
    expect(classifyDevice({ ...base, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe('phone');
  });

  it('treats a coarse-pointer touch device as a phone', () => {
    expect(classifyDevice({ ...base, coarsePointer: true, hasTouch: true, ua: 'Mozilla/5.0' })).toBe('phone');
  });

  it('treats a fine-pointer no-touch device as desktop', () => {
    expect(classifyDevice({ ...base, coarsePointer: false, hasTouch: false, ua: 'Mozilla/5.0 (Windows NT 10.0)' })).toBe('desktop');
  });
});
