import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface text-ink', className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-6', className)} {...props} />;
}

export { Card, CardContent };
