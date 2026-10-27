/** Shared, dependency-free billing rules used by the app and Node tests. */
export function getInvoiceTotalAmount(invoice) {
  const total = Number(invoice?.total_amount) || 0;
  const waterCharge = Number(invoice?.water_charge) || 0;
  const legacyDeposit = invoice?.invoice_type === 'initial'
    ? Number(invoice.security_deposit) || 0
    : 0;
  return Math.max(0, Math.round((total - waterCharge - legacyDeposit) * 100) / 100);
}

/** Match an already-recorded transaction so proof retries cannot duplicate it. */
export function findMatchingPaymentForProof(proof, payments, stableReference) {
  const byReference = payments.find((payment) =>
    payment.invoice_id === proof.invoice_id
    && payment.reference_no === stableReference,
  );
  if (byReference || String(proof.reference_no || '').trim()) return byReference || null;

  const proofDate = String(proof.payment_date || '').slice(0, 10);
  const proofAmount = Math.round((Number(proof.amount) || 0) * 100) / 100;
  return payments.find((payment) =>
    payment.invoice_id === proof.invoice_id
    && Math.round((Number(payment.amount_paid) || 0) * 100) / 100 === proofAmount
    && String(payment.payment_date || '').slice(0, 10) === proofDate
    && String(payment.payment_method || '').toLowerCase() === String(proof.payment_method || '').toLowerCase(),
  ) || null;
}

export function getInvoiceBalance(invoice, payments = []) {
  const paid = payments
    .filter((payment) => payment.invoice_id === invoice?.id)
    .reduce((total, payment) => total + (Number(payment.amount_paid) || 0), 0);
  return Math.max(0, Math.round((getInvoiceTotalAmount(invoice) - paid) * 100) / 100);
}

export function getMonthlyWifiCharge(house, fallback = 100) {
  const amount = Number(house?.monthly_wifi_charge);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
}
