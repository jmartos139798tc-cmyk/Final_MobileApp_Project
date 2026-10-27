import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findMatchingPaymentForProof,
  getComplaintReportCounts,
  getInvoiceBalance,
  getInvoiceChargeBreakdown,
  getInvoiceTotalAmount,
  getLeaseOutstandingBalance,
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

test('lease outstanding balance includes every invoice on that lease', () => {
  const invoices = [
    { id: 'initial', lease_id: 'lease-1', total_amount: 1850 },
    { id: 'monthly', lease_id: 'lease-1', total_amount: 1922 },
    { id: 'other-lease', lease_id: 'lease-2', total_amount: 500 },
  ];
  const payments = [{ invoice_id: 'initial', amount_paid: 1750 }];

  assert.equal(getLeaseOutstandingBalance(invoices, 'lease-1', payments), 2022);
  assert.equal(getLeaseOutstandingBalance(invoices, 'lease-2', payments), 500);
  assert.equal(getLeaseOutstandingBalance(invoices, 'missing-lease', payments), 0);
});

test('invoice charge breakdown tracks per-item partial payments and legacy utility allocations', () => {
  const invoice = {
    id: 'inv-2',
    rent_charge: 1000,
    utility_charge: 300,
    water_charge: 0,
    other_charges: 100,
    total_amount: 1400,
  };
  const breakdown = getInvoiceChargeBreakdown(invoice, [
    { invoice_id: 'inv-2', charge_type: 'rent', amount_paid: 1000 },
    { invoice_id: 'inv-2', charge_type: 'utility', amount_paid: 100 },
    { invoice_id: 'inv-2', charge_type: 'wifi', amount_paid: 50 },
  ]);

  assert.deepEqual(breakdown.map(({ type, billed, paid, balance, status }) => ({
    type, billed, paid, balance, status,
  })), [
    { type: 'rent', billed: 1000, paid: 1000, balance: 0, status: 'paid' },
    { type: 'electricity', billed: 300, paid: 100, balance: 200, status: 'partial' },
    { type: 'water', billed: 0, paid: 0, balance: 0, status: 'paid' },
    { type: 'wifi', billed: 100, paid: 50, balance: 50, status: 'partial' },
  ]);
});

test('legacy unallocated payments waterfall through bill items without changing total balance', () => {
  const breakdown = getInvoiceChargeBreakdown({
    id: 'inv-3',
    rent_charge: 1000,
    utility_charge: 300,
    water_charge: 0,
    other_charges: 100,
    total_amount: 1400,
  }, [{ invoice_id: 'inv-3', amount_paid: 1100, charge_type: 'unallocated' }]);

  assert.deepEqual(breakdown.map(({ type, paid, balance, status }) => ({
    type, paid, balance, status,
  })), [
    { type: 'rent', paid: 1000, balance: 0, status: 'paid' },
    { type: 'electricity', paid: 100, balance: 200, status: 'partial' },
    { type: 'water', paid: 0, balance: 0, status: 'paid' },
    { type: 'wifi', paid: 0, balance: 100, status: 'unpaid' },
  ]);
});

test('monthly Wi-Fi charge reads the property setting and safely defaults for old rows', () => {
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: 75 }), 75);
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: 0 }), 0);
  assert.equal(getMonthlyWifiCharge({ monthly_wifi_charge: -1 }), 100);
  assert.equal(getMonthlyWifiCharge({}), 100);
});

test('complaint report counts use filing and resolution dates for the selected month', () => {
  const complaints = [
    { id: 'comp-1', status: 'pending', filed_at: 'Oct 28, 2026' },
    { id: 'comp-2', status: 'resolved', filed_at: 'Sep 30, 2026', resolved_at: '2026-10-02T10:00:00.000Z' },
    { id: 'comp-3', status: 'resolved', filed_at: 'Oct 15, 2026', resolved_at: null },
    { id: 'comp-4', status: 'resolved', filed_at: 'Sep 15, 2026', resolved_at: null },
  ];

  assert.deepEqual(getComplaintReportCounts(complaints, '2026-10'), {
    newComplaints: 2,
    resolved: 2,
  });
});

test('payment proof retries match the stable reference and never match a different invoice', () => {
  const proof = { invoice_id: 'inv-1', reference_no: 'GCASH-123' };
  const payment = { invoice_id: 'inv-1', reference_no: 'GCASH-123' };
  assert.equal(findMatchingPaymentForProof(proof, [payment], 'GCASH-123'), payment);
  assert.equal(findMatchingPaymentForProof(proof, [{ ...payment, invoice_id: 'inv-2' }], 'GCASH-123'), null);
});

test('payment proof retries do not match a payment allocated to another invoice item', () => {
  const proof = { invoice_id: 'inv-1', reference_no: 'GCASH-123', charge_type: 'electricity' };
  const payment = { invoice_id: 'inv-1', reference_no: 'GCASH-123', charge_type: 'rent' };
  assert.equal(findMatchingPaymentForProof(proof, [payment], 'GCASH-123'), null);
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
