import { describe, expect, it } from 'vitest';
import { parseHash } from './router';

describe('parseHash', () => {
  it('routes a valid pairing hash to the phone view', () => {
    expect(parseHash('#/p/upn-abc123xyz9')).toEqual({ name: 'phone', peerId: 'upn-abc123xyz9' });
  });

  it.each(['', '#', '#/', '#/anything', '#/p/', '#/p/not-a-peer-id', '#/p/upn-ABC123XYZ9'])(
    'falls back to the host view for %s',
    (hash) => {
      expect(parseHash(hash)).toEqual({ name: 'host' });
    },
  );

  it('ignores a trailing query on the pairing hash', () => {
    expect(parseHash('#/p/upn-abc123xyz9?revolut=revolut://qr')).toEqual({
      name: 'phone',
      peerId: 'upn-abc123xyz9',
    });
  });
});
