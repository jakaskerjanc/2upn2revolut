import { LANGUAGES } from '../i18n';
import { setLang, useAppState } from '../session/store';
import { useT } from '../session/useT';
import { cn } from '../lib/cn';

interface LanguageToggleProps {
  /** `hero` renders the on-gradient treatment. */
  tone?: 'default' | 'hero';
}

function LanguageToggle({ tone = 'default' }: LanguageToggleProps) {
  const { lang } = useAppState();
  const t = useT();
  const hero = tone === 'hero';

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn(
        'flex items-center gap-1 rounded-full p-1',
        hero ? 'bg-white/15' : 'bg-surface-soft',
      )}
    >
      {LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors',
            lang === code
              ? hero
                ? 'bg-white text-hero-from'
                : 'bg-ink text-on-ink'
              : hero
                ? 'text-white'
                : 'text-muted hover:text-ink',
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export { LanguageToggle };
