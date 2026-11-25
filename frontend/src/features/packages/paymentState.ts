export const CANCELLED_PAYMENT_MESSAGE = 'This payment has been cancelled. A new payment link cannot be created for this registration. Please start a new registration.';
export class PaymentNotice extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Decisions use server state, never URL parameters, iframe exit events or message matching. */
export function paymentNotice(payment: { paymentState?: string; reviewRequired?: boolean; applied?: boolean; applicationError?: string }): PaymentNotice | null {
  if (payment.reviewRequired || (payment.paymentState === 'PAID' && !payment.applied)) {
    return new PaymentNotice('PAYMENT_REVIEW_REQUIRED', (payment.paymentState === 'PAID'
      ? 'Payment received, but package activation requires manager review. '
      : 'This payment requires manager review. ') + (payment.applicationError || 'Please contact the club manager.'));
  }
  if (payment.paymentState === 'CANCELLED') return new PaymentNotice('PAYMENT_CANCELLED', CANCELLED_PAYMENT_MESSAGE);
  if (payment.paymentState === 'EXPIRED') return new PaymentNotice('REGISTRATION_EXPIRED', 'This registration has expired. Please start a new registration.');
  return null;
}

export function terminalPaymentCode(code?: string): boolean {
  return ['PAYMENT_CANCELLED', 'REGISTRATION_EXPIRED', 'PAYMENT_REVIEW_REQUIRED', 'PAYMENT_ALREADY_PAID'].includes(code || '');
}
