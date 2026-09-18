import { describe, expect, it } from 'vitest';
import { phoneStep } from './steps';
import { initialState, type AppState, type SentPayment } from './store';

const payment: SentPayment = {
  id: 'p1',
  epc: 'BCD\n002',
  payment: {
    name: 'Telekom Slovenije d.d.',
    iban: 'SI56020170014356205',
    amountCents: 12345,
    purposeCode: 'OTHR',
    reference: 'SI00 1234-5678',
    remittance: 'Plačilo računa',
  },
};

function state(overrides: Partial<AppState>): AppState {
  return { ...initialState(), ...overrides };
}

describe('phoneStep', () => {
  it('is scan when nothing has been scanned yet', () => {
    expect(phoneStep(state({ payments: [] }))).toBe('scan');
  });

  it('is pay once a payment exists', () => {
    expect(phoneStep(state({ payments: [payment] }))).toBe('pay');
  });

  it('returns to scan when payments are cleared for another bill', () => {
    const withPayment = state({ payments: [payment] });
    expect(phoneStep(withPayment)).toBe('pay');
    expect(phoneStep({ ...withPayment, payments: [] })).toBe('scan');
  });
});
