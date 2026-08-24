import { translate, type TranslationKey } from '../i18n';
import { useAppState } from './store';

/** Translation function bound to the language currently in the store. */
export function useT(): (key: TranslationKey) => string {
  const { lang } = useAppState();
  return (key: TranslationKey) => translate(lang, key);
}
