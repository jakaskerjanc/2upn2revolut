import { Toaster as SonnerToaster } from 'sonner';

/** Toasts carry transport errors. Theme follows the system, like the rest of the app. */
function Toaster() {
  return (
    <SonnerToaster
      theme="system"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'rounded-card border border-line bg-surface text-ink shadow-lg',
          description: 'text-muted',
        },
      }}
    />
  );
}

export { Toaster };
