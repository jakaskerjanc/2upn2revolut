import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import { cn } from '../lib/cn';

interface QrCodeProps {
  value: string;
  /** Rendered edge length in CSS pixels. */
  size: number;
  label: string;
  className?: string;
}

/**
 * The white card and the wide quiet-zone margin both serve the same
 * correctness requirement: a scanner needs the QR's quiet zone intact, so
 * the background stays white in dark theme and the margin isn't trimmed.
 */
function QrCode({ value, size, label, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;

    // Render to a detached canvas rather than painting canvasRef directly:
    // that way, if `value` changes again before this resolves, the stale
    // result never touches the visible canvas even if resolution order
    // ever stops matching call order.
    void QRCode.toCanvas(value, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: size,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((rendered) => {
      if (cancelled) return;
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      canvas.getContext('2d')?.drawImage(rendered, 0, 0);
    });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className={cn('rounded-card bg-white p-4 shadow-sm', className)}>
      <canvas ref={canvasRef} role="img" aria-label={label} className="block h-auto w-full" />
    </div>
  );
}

export { QrCode };
