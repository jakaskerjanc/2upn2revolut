import { describe, expect, it } from 'vitest';
import { pickSaveStrategy, type ShareCapableNavigator } from './save';

const file = new File([new Uint8Array([1, 2, 3])], 'epc.png', { type: 'image/png' });

describe('pickSaveStrategy', () => {
  it('shares when the navigator can share the file', () => {
    const nav: ShareCapableNavigator = { canShare: () => true, share: async () => {} };
    expect(pickSaveStrategy(nav, file)).toBe('share');
  });

  it('downloads when share is missing', () => {
    const nav: ShareCapableNavigator = { canShare: () => true };
    expect(pickSaveStrategy(nav, file)).toBe('download');
  });

  it('downloads when canShare rejects the file', () => {
    const nav: ShareCapableNavigator = { canShare: () => false, share: async () => {} };
    expect(pickSaveStrategy(nav, file)).toBe('download');
  });

  it('downloads when neither API exists', () => {
    expect(pickSaveStrategy({}, file)).toBe('download');
  });
});
