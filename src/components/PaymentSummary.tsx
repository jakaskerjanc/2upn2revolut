import { formatEuros, type Payment } from '../core/payment';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

interface PaymentSummaryProps {
  payment: Payment;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Revolut transaction-detail rows: avatar + recipient, then label/value pairs. */
function PaymentSummary({ payment }: PaymentSummaryProps) {
  const t = useT();

  const rows: Array<[TranslationKey, string]> = [
    ['payment.iban', payment.iban],
    ['payment.amount', `EUR ${formatEuros(payment.amountCents)}`],
    ['payment.reference', payment.reference],
    ['payment.remittance', payment.remittance],
    ['payment.purpose', payment.purposeCode],
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-surface-soft font-display flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-medium"
        >
          {initial(payment.name)}
        </span>
        <p className="font-display text-lg font-medium">{payment.name}</p>
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
        {rows
          .filter(([, value]) => value.trim().length > 0)
          .map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-sm text-muted">{t(key)}</dt>
              <dd className="text-sm tabular-nums break-words">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export { PaymentSummary };
