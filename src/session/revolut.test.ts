import { describe, expect, it } from 'vitest';
import { DEFAULT_REVOLUT_LINK, resolveRevolutLink } from './revolut';

describe('resolveRevolutLink', () => {
  it('falls back to the default link', () => {
    expect(resolveRevolutLink('', undefined)).toBe(DEFAULT_REVOLUT_LINK);
    expect(DEFAULT_REVOLUT_LINK).toBe('revolut://app/payments');
  });

  it('prefers the build-time override over the default', () => {
    expect(resolveRevolutLink('', 'revolut://app/scan')).toBe('revolut://app/scan');
  });

  it('prefers the per-session query override over everything', () => {
    expect(resolveRevolutLink('?revolut=revolut%3A%2F%2Fqr', 'revolut://app/scan')).toBe(
      'revolut://qr',
    );
  });

  it('ignores an empty query override', () => {
    expect(resolveRevolutLink('?revolut=', 'revolut://app/scan')).toBe('revolut://app/scan');
  });

  it('ignores an override that is not a custom scheme or https url', () => {
    expect(resolveRevolutLink('?revolut=javascript%3Aalert(1)', undefined)).toBe(
      DEFAULT_REVOLUT_LINK,
    );
    expect(resolveRevolutLink('?revolut=not a url', undefined)).toBe(DEFAULT_REVOLUT_LINK);
  });

  it('accepts an https override', () => {
    expect(resolveRevolutLink('?revolut=https%3A%2F%2Frevolut.me', undefined)).toBe(
      'https://revolut.me',
    );
  });
});
