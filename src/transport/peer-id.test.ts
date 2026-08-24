import { describe, expect, it } from 'vitest';
import { generatePeerId, isValidPeerId, PEER_ID_PATTERN } from './peer-id';

describe('generatePeerId', () => {
  it('produces upn- plus exactly 10 lowercase alphanumerics', () => {
    for (let i = 0; i < 200; i += 1) {
      const id = generatePeerId();
      expect(id).toMatch(PEER_ID_PATTERN);
      expect(id).toHaveLength(14);
    }
  });

  it('does not repeat itself', () => {
    const ids = new Set(Array.from({ length: 500 }, () => generatePeerId()));
    expect(ids.size).toBe(500);
  });
});

describe('isValidPeerId', () => {
  it.each(['upn-abc123xyz9', 'upn-0000000000'])('accepts %s', (id) => {
    expect(isValidPeerId(id)).toBe(true);
  });

  it.each([
    'upn-ABC123XYZ9',
    'upn-short',
    'upn-toolongtoolong',
    'abc123xyz9',
    'upn-abc_123xyz',
    '',
    'upn-abc123xyz9 ',
  ])('rejects %s', (id) => {
    expect(isValidPeerId(id)).toBe(false);
  });
});
