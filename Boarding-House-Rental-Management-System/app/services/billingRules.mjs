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
  const proofChargeType = proof.charge_type === 'utility'
    ? 'electricity'
    : proof.charge_type || 'unallocated';
  const matchesChargeType = (payment) => {
    if (proofChargeType === 'unallocated') return true;
    const paymentChargeType = payment.charge_type === 'utility'
      ? 'electricity'
      : payment.charge_type || 'unallocated';
    return paymentChargeType === proofChargeType;
  };
  const byReference = payments.find((payment) =>
    payment.invoice_id === proof.invoice_id
    && payment.reference_no === stableReference
    && matchesChargeType(payment),
  );
  if (byReference || String(proof.reference_no || '').trim()) return byReference || null;

  const proofDate = String(proof.payment_date || '').slice(0, 10);
  const proofAmount = Math.round((Number(proof.amount) || 0) * 100) / 100;
  return payments.find((payment) =>
    payment.invoice_id === proof.invoice_id
    && matchesChargeType(payment)
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

export function getLeaseOutstandingBalance(invoices, leaseId, payments = []) {
  const total = invoices
    .filter((invoice) => invoice.lease_id === leaseId)
    .reduce((balance, invoice) => balance + getInvoiceBalance(invoice, payments), 0);
  return Math.round(total * 100) / 100;
}

export function getInvoiceChargeBreakdown(invoice, payments = []) {
  const rent = Math.max(0, Number(invoice?.rent_charge) || 0);
  const electricity = Math.max(0, Number(invoice?.utility_charge) || 0);
  const water = Math.max(0, Number(invoice?.water_charge) || 0);
  const additionalCharges = Array.isArray(invoice?.additional_charges) ? invoice.additional_charges : [];
  const wifiCharge = additionalCharges.find((charge) =>
    charge.id === 'wifi' || String(charge.label || '').toLowerCase() === 'wi-fi',
  );
  const wifi = Math.max(0, Number(wifiCharge?.amount ?? invoice?.other_charges) || 0);
  const other = Math.max(0, Math.round((getInvoiceTotalAmount(invoice) - rent - electricity - wifi) * 100) / 100);
  const totals = { rent, electricity, water, wifi, other };
  const directPaid = { rent: 0, electricity: 0, water: 0, wifi: 0, other: 0 };
  let unallocatedPaid = 0;

  payments
    .filter((payment) => payment.invoice_id === invoice?.id)
    .forEach((payment) => {
      const amount = Math.max(0, Number(payment.amount_paid) || 0);
      const type = payment.charge_type === 'utility' ? 'electricity' : payment.charge_type;
      if (type === 'other' && totals.other === 0) {
        directPaid.wifi = Math.round((directPaid.wifi + amount) * 100) / 100;
      } else if (Object.prototype.hasOwnProperty.call(directPaid, type)) {
        directPaid[type] = Math.round((directPaid[type] + amount) * 100) / 100;
      } else {
        unallocatedPaid = Math.round((unallocatedPaid + amount) * 100) / 100;
      }
    });

  return [
    { type: 'rent', label: 'Rent' },
    { type: 'electricity', label: 'Electricity' },
    { type: 'water', label: 'Water' },
    { type: 'wifi', label: 'Wi-Fi' },
    { type: 'other', label: 'Other charges' },
  ]
    .filter((item) => item.type !== 'other' || totals.other > 0)
    .map((item) => {
      const billed = Math.round(totals[item.type] * 100) / 100;
      const unallocatedForItem = Math.min(unallocatedPaid, Math.max(0, billed - directPaid[item.type]));
      const paid = Math.min(billed, Math.round((directPaid[item.type] + unallocatedForItem) * 100) / 100);
      unallocatedPaid = Math.max(0, Math.round((unallocatedPaid - unallocatedForItem) * 100) / 100);
      const balance = Math.max(0, Math.round((billed - paid) * 100) / 100);
      return {
        ...item,
        billed,
        paid,
        balance,
        status: balance === 0 ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
      };
    });
}

export function getMonthlyWifiCharge(house, fallback = 100) {
  const amount = Number(house?.monthly_wifi_charge);
  return Number.isFinite(amount) && amount >= 0 ? amount : fallback;
}

function getMonthKey(value) {
  const dateValue = value?.toDate ? value.toDate() : value;
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null;
    return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
  }

  const text = String(dateValue || '').trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const displayDateMatch = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (displayDateMatch) {
    const monthIndex = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ].indexOf(displayDateMatch[1].toLowerCase());
    if (monthIndex >= 0) {
      return `${displayDateMatch[3]}-${String(monthIndex + 1).padStart(2, '0')}`;
    }
  }

  const timestamp = Date.parse(text);
  if (!Number.isNaN(timestamp)) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return null;
}

function getComplaintMonth(complaint, dateField, fallbackFields = []) {
  const dates = [complaint?.[dateField], ...fallbackFields.map((field) => complaint?.[field])];
  for (const date of dates) {
    const monthKey = getMonthKey(date);
    if (monthKey) return monthKey;
  }

  const idTimestamp = Number(String(complaint?.id || '').match(/\d{10,}/)?.[0]);
  if (!Number.isFinite(idTimestamp)) return null;
  const idDate = new Date(idTimestamp);
  return `${idDate.getFullYear()}-${String(idDate.getMonth() + 1).padStart(2, '0')}`;
}

export function getComplaintReportCounts(complaints, period) {
  const newComplaints = complaints.filter((complaint) =>
    getComplaintMonth(complaint, 'created_at', ['filed_at']) === period,
  ).length;
  const resolved = complaints.filter((complaint) =>
    complaint.status === 'resolved'
    && getComplaintMonth(complaint, 'resolved_at', ['created_at', 'filed_at']) === period,
  ).length;
  return { newComplaints, resolved };
}
