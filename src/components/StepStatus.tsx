import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepStatusProps {
  activeIndex: number;
  /** `hero` renders the on-gradient treatment. */
  tone?: 'default' | 'hero';
}

/** Static progress indicator: the phone's Scan → Pay, and desktop's input → result. */
function StepStatus({ activeIndex, tone = 'default' }: StepStatusProps) {
  const t = useT();
  const labels = [t('step.scan'), t('step.pay')];
  const hero = tone === 'hero';

  return (
    <ol aria-label={labels.join(' → ')} className="flex w-fit items-center gap-2">
      {labels.map((label, index) => {
        const active = index === activeIndex;
        return (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden className={cn('h-px w-5', hero ? 'bg-white/40' : 'bg-line')} />
            )}
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 rounded-full',
                active
                  ? hero
                    ? 'bg-white'
                    : 'bg-ink'
                  : hero
                    ? 'border border-white/60'
                    : 'border border-faint',
              )}
            />
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'text-xs tracking-[0.15em] uppercase',
                active
                  ? 'font-medium'
                  : 'font-normal',
                active ? (hero ? 'text-white' : 'text-ink') : hero ? 'text-white' : 'text-muted',
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

export { StepStatus };
