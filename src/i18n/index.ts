import { en } from './en';
import { sl } from './sl';

export type Lang = 'sl' | 'en';
export type TranslationKey = keyof typeof sl;

export const LANGUAGES: readonly Lang[] = ['sl', 'en'];

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { sl, en };

const STORAGE_KEY = '2upn2revolut.lang';

export function translate(lang: Lang, key: TranslationKey): string {
  return DICTIONARIES[lang][key];
}

/** Slovenian is the default: UPN is a Slovenian payment format. */
export function detectLanguage(): Lang {
  if (typeof navigator === 'undefined') return 'sl';
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'sl';
}

export function loadLanguage(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'sl' || stored === 'en') return stored;
  } catch {
    // Private mode or blocked storage: fall through to detection.
  }
  return detectLanguage();
}

export function saveLanguage(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Persisting the choice is a convenience, not a requirement.
  }
}
