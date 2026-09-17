import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

/** The theme canvas. Views are full-bleed and own their own chrome. */
function AppShell({ children }: AppShellProps) {
  return <div className="bg-canvas text-ink min-h-dvh">{children}</div>;
}

export { AppShell };
