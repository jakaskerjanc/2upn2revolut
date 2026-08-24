import { LANGUAGES } from '../i18n';
import { setLang, useAppState } from '../session/store';
import { useT } from '../session/useT';
import { cn } from '../lib/cn';

function LanguageToggle() {
  const { lang } = useAppState();
  const t = useT();

  return (
    <div role="group" aria-label={t('lang.label')} className="flex items-center gap-1">
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium tracking-widest uppercase transition-colors',
            lang === code ? 'bg-ink text-canvas' : 'text-muted hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export { LanguageToggle };
