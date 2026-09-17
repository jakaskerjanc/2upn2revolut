import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface SheetProps {
  children: ReactNode;
  className?: string;
}

/** Surface panel that overlaps the hero's bottom edge. */
function Sheet({ children, className }: SheetProps) {
  return (
    <div
      className={cn(
        'rounded-t-sheet bg-surface -mt-10 flex flex-col items-center gap-6 px-5 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Sheet };
