import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMatchingPaymentForProof,
  getInvoiceBalance,
  getInvoiceTotalAmount,
  getMonthlyWifiCharge,
} from '../app/services/billingRules.mjs';

test('invoice totals exclude legacy water and initial deposit amounts', () => {
  assert.equal(getInvoiceTotalAmount({ total_amount: 3600, water_charge: 100 }), 3500);
  assert.equal(getInvoiceTotalAmount({
    total_amount: 5100,
    invoice_type: 'initial',
    security_deposit: 1000,
  }), 4100);
});

test('partial payments produce the expected invoice balance', () => {
  const invoice = { id: 'inv-1', total_amount: 2600 };
  const payments = [
    { invoice_id: 'inv-1', amount_paid: 1000 },
    { invoice_id: 'other', amount_paid: 500 },
  ];
  assert.equal(getInvoiceBalance(invoice, payments), 1600);
  assert.equal(getInvoiceBalance(invoice, [{ invoice_id: 'inv-1', amount_paid: 3000 }]), 0);
});

test('monthly Wi-Fi charge reads the property setting and safely defaults for old rows', () => {
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: 75 }), 75);
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: 0 }), 0);
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: -1 }), 100);
  assert.equal(getMonthlyWifiCharge({}), 100);
});

test('payment proof retries match the stable reference and never match a different invoice', () => {
  const proof = { invoice_id: 'inv-1', reference_no: 'GCASH-123' };
  const payment = { invoice_id: 'inv-1', reference_no: 'GCASH-123' };
  assert.equal(findMatchingPaymentForProof(proof, [payment], 'GCASH-123'), payment);
  assert.equal(findMatchingPaymentForProof(proof, [{ ...payment, invoice_id: 'inv-2' }], 'GCASH-123'), null);
});

test('proof without a reference matches a manually recorded payment once', () => {
  const proof = {
    invoice_id: 'inv-1', amount: 1250, payment_date: '2026-10-20', payment_method: 'GCash',
  };
  const payment = {
    invoice_id: 'inv-1', amount_paid: 1250, payment_date: '2026-10-20', payment_method: 'gcash',
  };
  assert.equal(findMatchingPaymentForProof(proof, [payment], 'PROOF-proof-1'), payment);
  assert.equal(findMatchingPaymentForProof(proof, [{ ...payment, amount_paid: 1200 }], 'PROOF-proof-1'), null);
});
