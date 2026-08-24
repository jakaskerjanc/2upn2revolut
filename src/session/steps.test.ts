import { describe, expect, it } from 'vitest';
import { hostStep, phoneStep } from './steps';
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

describe('hostStep', () => {
  it('is pair before a phone connects', () => {
    expect(hostStep(state({ connected: false }))).toBe('pair');
  });

  it('is waiting once connected with no payment yet', () => {
    expect(hostStep(state({ connected: true }))).toBe('waiting');
  });

  it('is display once a payment has arrived', () => {
    expect(hostStep(state({ connected: true, payments: [payment] }))).toBe('display');
  });

  it('keeps displaying the last payment after the phone drops off', () => {
    expect(hostStep(state({ connected: false, payments: [payment] }))).toBe('display');
  });
});

describe('phoneStep', () => {
  it('is connect before the channel opens', () => {
    expect(phoneStep(state({ connected: false }))).toBe('connect');
  });

  it('is scan once connected with nothing sent', () => {
    expect(phoneStep(state({ connected: true }))).toBe('scan');
  });

  it('is pay once a payment has been sent', () => {
    expect(phoneStep(state({ connected: true, payments: [payment] }))).toBe('pay');
  });

  it('returns to scan when the payment list is cleared for another bill', () => {
    expect(phoneStep(state({ connected: true, payments: [] }))).toBe('scan');
  });
});
