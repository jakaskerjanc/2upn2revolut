import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepPillsProps {
  activeIndex: number;
  /** `hero` renders the on-gradient treatment. */
  tone?: 'default' | 'hero';
}

/** Two pill segments: the phone's Scan → Pay, and desktop's input → result. */
function StepPills({ activeIndex, tone = 'default' }: StepPillsProps) {
  const t = useT();
  const labels = [t('step.scan'), t('step.pay')];
  const hero = tone === 'hero';

  return (
    <ol
      className={cn(
        'flex w-fit items-center gap-1 rounded-full p-1',
        hero ? 'bg-white/15' : 'bg-surface-soft',
      )}
    >
      {labels.map((label, index) => {
        const active = index === activeIndex;
        return (
          <li key={label}>
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors',
                active
                  ? hero
                    ? 'bg-white text-hero-from'
                    : 'bg-ink text-on-ink'
                  : hero
                    ? 'text-white/75'
                    : 'text-muted',
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export { StepPills };
