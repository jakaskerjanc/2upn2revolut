import { describe, expect, it } from 'vitest';
import { en } from './en';
import { sl } from './sl';
import { LANGUAGES, translate } from './index';

describe('dictionaries', () => {
  it('has the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(sl).sort());
  });

  it('has no empty strings', () => {
    for (const lang of LANGUAGES) {
      for (const key of Object.keys(sl) as Array<keyof typeof sl>) {
        expect(translate(lang, key).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
