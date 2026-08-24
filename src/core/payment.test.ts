import { describe, expect, it } from 'vitest';
import { centsFromEuros, formatEuros } from './payment';

describe('centsFromEuros', () => {
  it.each([
    [123.45, 12345],
    [0, 0],
    [5, 500],
    [0.01, 1],
    [0.1, 10],
    [0.29, 29],
    [1234.56, 123456],
    [999999999.99, 99999999999],
  ])('converts %s EUR to %s cents', (euros, cents) => {
    expect(centsFromEuros(euros)).toBe(cents);
  });

  it.each([
    [0.005, 1],
    [0.045, 5],
    [1.005, 101],
    [2.675, 268],
  ])('rounds the half cent up: %s -> %s', (euros, cents) => {
    expect(centsFromEuros(euros)).toBe(cents);
  });

  it('returns an integer for values binary floats cannot represent exactly', () => {
    expect(Number.isInteger(centsFromEuros(1234.56))).toBe(true);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'returns 0 for the non-finite value %s',
    (euros) => {
      expect(centsFromEuros(euros)).toBe(0);
    },
  );
});

describe('formatEuros', () => {
  it.each([
    [12345, '123.45'],
    [0, '0.00'],
    [1, '0.01'],
    [500, '5.00'],
    [99999999999, '999999999.99'],
  ])('formats %s cents as %s', (cents, text) => {
    expect(formatEuros(cents)).toBe(text);
  });
});
