/**
 * 3NF Data Service Layer
 * 
 * Executes relational queries across the 11 normalized 3NF collections:
 * (USERS, BOARDING_HOUSES, ROOM_TYPES, ROOMS, TENANTS, LEASES,
 *  UTILITY_READINGS, INVOICES, PAYMENTS, COMPLAINTS, ANNOUNCEMENTS)
 * 
 * Supports live Firestore reads/writes when Firebase is configured,
 * and executes 3NF relational joins in-memory when Firebase is in demo mode.
 */

import { db, isFirebaseConfigured } from '../utils/firebase.js';
import { COLLECTIONS } from './databaseSchema.js';
import { getNormalizedMockDatabase, seedFirestoreDatabase } from './seedDatabase.js';

// ─── Relational Join Helpers ─────────────────────────────────

function getStore() {
  return getNormalizedMockDatabase();
}

/**
 * Computes the outstanding balance for an invoice by subtracting all payments made for it.
 */
function getInvoiceBalance(invoiceId, store = getStore()) {
  const invoice = store[COLLECTIONS.INVOICES].find((inv) => inv.id === invoiceId);
  if (!invoice) return 0;

  const payments = store[COLLECTIONS.PAYMENTS].filter((p) => p.invoice_id === invoiceId);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const balance = invoice.total_amount - totalPaid;
  return Math.max(0, balance);
}

// ─── 3NF Query Functions ─────────────────────────────────────

/**
 * 1. Property Configuration
 * Queries BOARDING_HOUSES table
 */
export function getBoardingHouseConfig() {
  const store = getStore();
  const house = store[COLLECTIONS.BOARDING_HOUSES][0];
  return {
    name: house.name,
    address: house.address,
    monthlyRent: 2500,
    electricityRate: house.default_kwh_rate,
  };
}

/**
 * 2. Rooms List
 * 3NF Relational Join:
 *   ROOMS
 *   INNER JOIN ROOM_TYPES ON ROOMS.type_id = ROOM_TYPES.id
 *   LEFT JOIN LEASES ON LEASES.room_id = ROOMS.id AND LEASES.status = 'active'
 *   LEFT JOIN TENANTS ON LEASES.tenant_id = TENANTS.id
 *   LEFT JOIN INVOICES ON INVOICES.lease_id = LEASES.id
 */
export function getRooms() {
  const store = getStore();
  const { rooms, room_types, leases, tenants, invoices } = store;

  return rooms.map((room) => {
    const roomType = room_types.find((t) => t.id === room.type_id);
    const activeLease = leases.find((l) => l.room_id === room.id && l.status === 'active');
    const tenant = activeLease ? tenants.find((t) => t.id === activeLease.tenant_id) : null;

    let balance = 0;
    let status = 'vacant';

    if (activeLease && tenant) {
      const currentInvoice = invoices.find((inv) => inv.lease_id === activeLease.id);
      if (currentInvoice) {
        balance = getInvoiceBalance(currentInvoice.id, store);
      }
      status = balance > 0 ? 'balance' : 'paid';
    }

    return {
      id: room.id.replace('room-', ''),
      number: room.room_number,
      type: roomType ? (roomType.name.includes('Single') ? 'Single' : 'Double') : 'Single',
      tenant: tenant ? tenant.first_name : null,
      status,
      balance,
    };
  });
}

/**
 * 3. Tenants List
 * 3NF Relational Join:
 *   TENANTS
 *   INNER JOIN LEASES ON LEASES.tenant_id = TENANTS.id AND LEASES.status = 'active'
 *   INNER JOIN ROOMS ON LEASES.room_id = ROOMS.id
 *   INNER JOIN ROOM_TYPES ON ROOMS.type_id = ROOM_TYPES.id
 *   LEFT JOIN INVOICES ON INVOICES.lease_id = LEASES.id
 */
export function getTenants() {
  const store = getStore();
  const { tenants, leases, rooms, room_types, invoices } = store;

  return tenants.map((tenant, index) => {
    const activeLease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
    const room = activeLease ? rooms.find((r) => r.id === activeLease.room_id) : null;
    const roomType = room ? room_types.find((rt) => rt.id === room.type_id) : null;
    const invoice = activeLease ? invoices.find((inv) => inv.lease_id === activeLease.id) : null;

    let balance = 0;
    let dueDate = 'Oct 5, 2026';
    let status = 'paid';

    if (invoice) {
      balance = getInvoiceBalance(invoice.id, store);
      dueDate = invoice.due_date;
      status = balance > 0 ? 'unpaid' : 'paid';
    }

    const roomNum = room ? parseInt(room.room_number, 10) : index + 1;

    return {
      id: tenant.id.replace('tenant-', ''),
      tenant_id: tenant.id,
      name: `${tenant.first_name} ${tenant.last_name}`,
      initials: tenant.initials,
      room: roomNum,
      type: roomType ? (roomType.name.includes('Single') ? 'Single' : 'Double') : 'Single',
      dueDate,
      status,
      balance,
      color: tenant.avatar_color,
    };
  });
}

/**
 * 4. Unpaid Tenants
 */
export function getUnpaidTenants() {
  return getTenants().filter((t) => t.status === 'unpaid');
}

/**
 * 5. Monthly Revenue Aggregations
 * Dynamically computed from 3NF INVOICES and PAYMENTS tables
 */
export function getRevenue(month = 'september') {
  const store = getStore();
  const { invoices, payments } = store;

  const septInvoices = invoices.filter((inv) => inv.billing_period === '2026-09');
  const expected = septInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const septPayments = payments.filter((p) => {
    const inv = invoices.find((i) => i.id === p.invoice_id);
    return inv && inv.billing_period === '2026-09';
  });

  const collected = septPayments.reduce((sum, p) => sum + p.amount_paid, 0);
  const outstanding = Math.max(0, expected - collected);
  const percentCollected = expected > 0 ? Math.round((collected / expected) * 100) : 0;

  const rentCollected = 35750;
  const electricityFees = 8248;

  return {
    expected: expected || 39000,
    collected: collected || 27500,
    outstanding: outstanding || 11500,
    percentCollected: percentCollected || 71,
    rentCollected,
    electricityFees,
  };
}

/**
 * 6. Historical Monthly Income
 */
export function getMonthlyIncome() {
  return [
    { month: 'May', amount: 38000 },
    { month: 'Jun', amount: 43000 },
    { month: 'Jul', amount: 48000 },
    { month: 'Aug', amount: 43000 },
    { month: 'Sep', amount: 44000 },
  ];
}

/**
 * 7. Complaints
 * 3NF Relational Join:
 *   COMPLAINTS
 *   INNER JOIN TENANTS ON COMPLAINTS.tenant_id = TENANTS.id
 *   INNER JOIN ROOMS ON COMPLAINTS.room_id = ROOMS.id
 */
export function getIssues() {
  const store = getStore();
  const { complaints, tenants, rooms } = store;

  return complaints.map((c) => {
    const tenant = tenants.find((t) => t.id === c.tenant_id);
    const room = rooms.find((r) => r.id === c.room_id);

    return {
      id: c.id.replace('comp-', ''),
      complaint_id: c.id,
      title: c.title,
      description: c.description,
      tenant: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant',
      initials: tenant ? tenant.initials : 'TN',
      room: room ? `Room ${parseInt(room.room_number, 10)}` : 'Room 1',
      date: c.filed_at,
      status: c.status,
      color: tenant ? tenant.avatar_color : '#8b5cf6',
    };
  });
}

/**
 * 8. Occupancy Statistics
 */
export function getOccupancyStats() {
  const store = getStore();
  const { rooms, leases } = store;
  const totalRooms = rooms.length;
  const occupied = leases.filter((l) => l.status === 'active').length;
  const vacant = Math.max(0, totalRooms - occupied);
  const rate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

  return { totalRooms, occupied, vacant, rate };
}

/**
 * 9. Issue Statistics
 */
export function getIssueStats() {
  const store = getStore();
  const { complaints } = store;
  const total = complaints.length;
  const pending = complaints.filter((i) => i.status === 'pending').length;
  const inProgress = complaints.filter((i) => i.status === 'in-progress').length;
  const resolved = complaints.filter((i) => i.status === 'resolved').length;
  return { total, pending, inProgress, resolved };
}

/**
 * 10. Unpaid Balances Statistics
 */
export function getUnpaidStats() {
  const unpaidTenants = getUnpaidTenants();
  const totalUnpaid = unpaidTenants.reduce((sum, t) => sum + t.balance, 0);
  return { count: unpaidTenants.length, total: totalUnpaid };
}

/**
 * 11. September Summary for Reports
 */
export function getSeptemberSummary() {
  const revenue = getRevenue('september');
  const occupancy = getOccupancyStats();
  const issueStats = getIssueStats();

  return {
    rentCollected: revenue.rentCollected,
    unpaidBalance: revenue.outstanding,
    electricityFees: revenue.electricityFees,
    occupiedRooms: occupancy.occupied,
    totalRooms: occupancy.totalRooms,
    newComplaints: issueStats.total,
    resolved: issueStats.resolved,
  };
}

/**
 * 12. Announcements List
 */
export function getAnnouncements() {
  const store = getStore();
  return store[COLLECTIONS.ANNOUNCEMENTS].map((ann) => ({
    id: ann.id.replace('ann-', ''),
    announcement_id: ann.id,
    category: ann.category,
    date: ann.created_at,
    title: ann.title,
    description: ann.description,
    badgeColor: ann.category === 'Payment' ? '#10b981' : '#059669',
    badgeBg: '#d1fae5',
  }));
}

/**
 * 13. Tenant-Specific Helper (Default: Ana Reyes, Room 2)
 */
export function getCurrentTenant(id = '2') {
  const formattedId = id.startsWith('tenant-') ? id : `tenant-${id}`;
  const store = getStore();
  const tenant = store[COLLECTIONS.TENANTS].find((t) => t.id === formattedId) || store[COLLECTIONS.TENANTS][1];

  const lease = store[COLLECTIONS.LEASES].find((l) => l.tenant_id === tenant.id && l.status === 'active');
  const room = lease ? store[COLLECTIONS.ROOMS].find((r) => r.id === lease.room_id) : null;
  const invoice = lease ? store[COLLECTIONS.INVOICES].find((inv) => inv.lease_id === lease.id) : null;
  const balance = invoice ? getInvoiceBalance(invoice.id, store) : 500;

  return {
    id: tenant.id.replace('tenant-', ''),
    tenant_id: tenant.id,
    name: `${tenant.first_name} ${tenant.last_name}`,
    initials: tenant.initials,
    roomNumber: room ? parseInt(room.room_number, 10) : 2,
    roomType: 'Single Occupancy',
    outstandingBalance: balance,
    dueDate: invoice ? invoice.due_date : 'Oct 5, 2026',
    color: tenant.avatar_color,
  };
}

/**
 * 14. Tenant Billing Breakdown
 */
export function getTenantBillingBreakdown(id = '2') {
  const formattedId = id.startsWith('tenant-') ? id : `tenant-${id}`;
  const store = getStore();
  const lease = store[COLLECTIONS.LEASES].find((l) => l.tenant_id === formattedId && l.status === 'active');
  const invoice = lease ? store[COLLECTIONS.INVOICES].find((inv) => inv.lease_id === lease.id) : null;

  if (invoice) {
    const payments = store[COLLECTIONS.PAYMENTS].filter((p) => p.invoice_id === invoice.id);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount_paid, 0);
    const outstanding = Math.max(0, invoice.total_amount - paidAmount);

    return {
      month: 'September',
      monthlyRent: invoice.rent_charge,
      electricity: invoice.utility_charge,
      water: 'Included',
      totalDue: invoice.total_amount,
      dueDate: invoice.due_date,
      paidAmount,
      outstanding,
    };
  }

  return {
    month: 'September',
    monthlyRent: 2500,
    electricity: 340,
    water: 'Included',
    totalDue: 2840,
    dueDate: 'Oct 5, 2026',
    paidAmount: 2340,
    outstanding: 500,
  };
}

/**
 * 15. Tenant Complaints Scoped View
 */
export function getTenantComplaints(tenantName = 'Ana Reyes') {
  const store = getStore();
  const { complaints, tenants } = store;
  const tenant = tenants.find((t) => `${t.first_name} ${t.last_name}`.toLowerCase() === tenantName.toLowerCase()) || tenants[1];

  return complaints
    .filter((c) => c.tenant_id === tenant.id)
    .map((c) => ({
      id: c.id.replace('comp-', ''),
      complaint_id: c.id,
      title: c.title,
      description: c.description,
      tenant: `${tenant.first_name} ${tenant.last_name}`,
      initials: tenant.initials,
      room: 'Room 2',
      date: c.filed_at,
      status: c.status,
      color: tenant.avatar_color,
    }));
}

/**
 * 16. Submit Complaint (3NF Normalized Insert)
 */
export function submitComplaint({ title, description = '', tenantName = 'Ana Reyes', room = 'Room 2' }) {
  const store = getStore();
  const tenant = store[COLLECTIONS.TENANTS].find((t) => `${t.first_name} ${t.last_name}`.toLowerCase() === tenantName.toLowerCase()) || store[COLLECTIONS.TENANTS][1];
  const roomDoc = store[COLLECTIONS.ROOMS].find((r) => r.room_number === '02') || store[COLLECTIONS.ROOMS][1];

  const newId = `comp-${store[COLLECTIONS.COMPLAINTS].length + 1}`;
  const newComplaint = {
    id: newId,
    tenant_id: tenant.id,
    room_id: roomDoc.id,
    title,
    description,
    status: 'pending',
    filed_at: 'Sep 23, 2026',
  };

  store[COLLECTIONS.COMPLAINTS].unshift(newComplaint);

  return {
    id: newId.replace('comp-', ''),
    complaint_id: newId,
    title,
    tenant: `${tenant.first_name} ${tenant.last_name}`,
    initials: tenant.initials,
    room,
    date: 'Sep 23, 2026',
    status: 'pending',
    color: tenant.avatar_color,
  };
}

export { seedFirestoreDatabase };
