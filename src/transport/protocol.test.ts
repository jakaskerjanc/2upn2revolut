import { describe, expect, it } from 'vitest';
import { helloMessage, parseWireMessage, paymentMessage } from './protocol';
import type { Payment } from '../core/payment';

const payment: Payment = {
  name: 'Telekom Slovenije d.d.',
  iban: 'SI56020170014356205',
  amountCents: 12345,
  purposeCode: 'OTHR',
  reference: 'SI00 1234-5678',
  remittance: 'Plačilo računa',
};

describe('parseWireMessage', () => {
  it('accepts a hello frame', () => {
    expect(parseWireMessage({ v: 1, type: 'hello', role: 'phone' })).toEqual({
      v: 1,
      type: 'hello',
      role: 'phone',
    });
  });

  it('accepts a payment frame', () => {
    const frame = { v: 1, type: 'payment', epc: 'BCD\n002', payment };
    expect(parseWireMessage(frame)).toEqual(frame);
  });

  it('rejects a frame from a future protocol version', () => {
    expect(parseWireMessage({ v: 2, type: 'hello', role: 'phone' })).toBeNull();
  });

  it('rejects an unknown message type', () => {
    expect(parseWireMessage({ v: 1, type: 'evict', role: 'phone' })).toBeNull();
  });

  it('rejects a payment frame with a fractional amount', () => {
    const frame = { v: 1, type: 'payment', epc: 'x', payment: { ...payment, amountCents: 1.5 } };
    expect(parseWireMessage(frame)).toBeNull();
  });

  it('rejects a payment frame missing a payment field', () => {
    const { iban: _iban, ...rest } = payment;
    expect(parseWireMessage({ v: 1, type: 'payment', epc: 'x', payment: rest })).toBeNull();
  });

  it.each([null, undefined, 'hello', 42, [], {}])('rejects the non-frame %s', (raw) => {
    expect(parseWireMessage(raw)).toBeNull();
  });

  it('strips unknown extra keys rather than trusting them', () => {
    const parsed = parseWireMessage({ v: 1, type: 'hello', role: 'phone', exec: 'rm -rf /' });
    expect(parsed).toEqual({ v: 1, type: 'hello', role: 'phone' });
    expect(parsed && 'exec' in parsed).toBe(false);
  });
});

describe('message constructors', () => {
  it('builds frames that pass their own validation', () => {
    expect(parseWireMessage(helloMessage())).toEqual(helloMessage());
    const message = paymentMessage('BCD\n002', payment);
    expect(parseWireMessage(message)).toEqual(message);
  });
});
