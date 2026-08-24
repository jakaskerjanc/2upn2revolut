import { formatEuros, type Payment } from '../core/payment';
import { useT } from '../session/useT';
import type { TranslationKey } from '../i18n';

interface PaymentSummaryProps {
  payment: Payment;
}

function PaymentSummary({ payment }: PaymentSummaryProps) {
  const t = useT();

  const rows: Array<[TranslationKey, string]> = [
    ['payment.name', payment.name],
    ['payment.iban', payment.iban],
    ['payment.amount', `EUR ${formatEuros(payment.amountCents)}`],
    ['payment.reference', payment.reference],
    ['payment.remittance', payment.remittance],
    ['payment.purpose', payment.purposeCode],
  ];

  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
      {rows
        .filter(([, value]) => value.trim().length > 0)
        .map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="text-sm text-muted">{t(key)}</dt>
            <dd className="text-sm break-words sm:text-base">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export { PaymentSummary };
