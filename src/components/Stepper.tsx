import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepperProps {
  /** 0 = Pair, 1 = Scan, 2 = Pay. */
  activeIndex: number;
}

/**
 * Both devices render the same three dots and each shows only its own next
 * action. It is derived from real connection state, so it cannot drift.
 */
function Stepper({ activeIndex }: StepperProps) {
  const t = useT();
  const labels = [t('step.pair'), t('step.scan'), t('step.pay')];

  return (
    <ol className="flex items-center gap-3" aria-label={labels.join(' → ')}>
      {labels.map((label, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'size-2.5 rounded-full transition-colors',
                active && 'bg-accent',
                done && 'bg-accent/40',
                !active && !done && 'bg-line',
              )}
            />
            <span
              className={cn(
                'text-sm tracking-wide',
                active ? 'text-ink font-medium' : 'text-muted',
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 && <span aria-hidden className="text-line">—</span>}
          </li>
        );
      })}
    </ol>
  );
}

export { Stepper };
