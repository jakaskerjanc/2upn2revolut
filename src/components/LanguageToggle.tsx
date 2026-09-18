import { LANGUAGES } from '../i18n';
import { setLang, useAppState } from '../session/store';
import { useT } from '../session/useT';
import { cn } from '../lib/cn';

function LanguageToggle() {
  const { lang } = useAppState();
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="bg-surface-soft flex items-center gap-1 rounded-full p-1"
    >
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'cursor-pointer rounded-full ps-[calc(0.625rem_+_0.15em)] pe-2.5 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors',
            lang === code ? 'bg-ink text-on-ink' : 'text-muted hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export { LanguageToggle };
