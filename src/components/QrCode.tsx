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
 * The white card is a correctness requirement, not a style choice: a QR code
 * needs its quiet zone, so it stays on white in dark theme too.
 */
function QrCode({ value, size, label, className }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, value, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: size,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [value, size]);

  return (
    <div className={cn('rounded-card bg-white p-4 shadow-sm', className)}>
      <canvas ref={canvasRef} role="img" aria-label={label} className="block h-auto w-full" />
    </div>
  );
}

export { QrCode };
