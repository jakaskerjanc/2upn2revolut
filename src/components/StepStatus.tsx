import { cn } from '../lib/cn';
import { useT } from '../session/useT';

interface StepStatusProps {
  activeIndex: number;
}

/** Static progress indicator: the phone's Scan → Pay, and desktop's input → result. */
function StepStatus({ activeIndex }: StepStatusProps) {
  const t = useT();
  const labels = [t('step.scan'), t('step.pay')];

  return (
    <ol aria-label={labels.join(' → ')} className="flex w-fit items-center gap-2">
      {labels.map((label, index) => {
        const active = index === activeIndex;
        return (
          <li key={index} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden className="bg-line h-px w-5" />}
            <span
              aria-hidden
              className={cn(
                'size-2 shrink-0 rounded-full',
                active ? 'bg-ink' : 'border-faint border',
              )}
            />
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'text-xs tracking-[0.15em] uppercase',
                active ? 'text-ink font-medium' : 'text-muted font-normal',
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
