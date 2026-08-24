import { z } from 'zod';
import type { Payment } from '../core/payment';

const paymentSchema = z.object({
  name: z.string(),
  iban: z.string(),
  amountCents: z.number().int(),
  purposeCode: z.string(),
  reference: z.string(),
  remittance: z.string(),
});

const helloSchema = z.object({
  v: z.literal(1),
  type: z.literal('hello'),
  role: z.literal('phone'),
});

const paymentFrameSchema = z.object({
  v: z.literal(1),
  type: z.literal('payment'),
  epc: z.string(),
  payment: paymentSchema,
});

export const wireMessageSchema = z.discriminatedUnion('type', [helloSchema, paymentFrameSchema]);

export type WireMessage = z.infer<typeof wireMessageSchema>;

export function helloMessage(): WireMessage {
  return { v: 1, type: 'hello', role: 'phone' };
}

export function paymentMessage(epc: string, payment: Payment): WireMessage {
  return { v: 1, type: 'payment', epc, payment };
}

/**
 * Validate a frame arriving off the public broker. Anything malformed, hostile,
 * or from a different protocol version becomes null rather than corrupting state.
 */
export function parseWireMessage(raw: unknown): WireMessage | null {
  const result = wireMessageSchema.safeParse(raw);
  return result.success ? result.data : null;
}
