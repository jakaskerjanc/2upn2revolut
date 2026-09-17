import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

interface HeroProps {
  children: ReactNode;
  className?: string;
}

/** Violet gradient band; views compose a header row and a headline inside. */
function Hero({ children, className }: HeroProps) {
  return (
    <div
      className={cn(
        'from-hero-from to-hero-to relative overflow-hidden bg-linear-to-br text-white',
        className,
      )}
    >
      <div aria-hidden className="hero-glow pointer-events-none absolute inset-0" />
      <div className="relative flex flex-col gap-6 px-5 pt-4 pb-16 sm:px-8">{children}</div>
    </div>
  );
}

export { Hero };
