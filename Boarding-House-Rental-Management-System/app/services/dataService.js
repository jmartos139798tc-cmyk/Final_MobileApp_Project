// Data Service Layer
// Provides data to all screens. Falls back to mock data when Firebase is not configured.
// Once Firebase is set up, switch to real Firestore reads.

import { db, isFirebaseConfigured } from '../utils/firebase';

// ─── Mock Data (used when Firebase is not configured) ────────

const BOARDING_HOUSE = {
  name: 'Neat & Groovy BH',
  address: 'Sample Address, City',
  monthlyRent: 2500,
  electricityRate: 12,
};

const MOCK_ROOMS = [
  { id: '1', number: '01', type: 'Single', tenant: 'Maria', status: 'paid', balance: 0 },
  { id: '2', number: '02', type: 'Single', tenant: 'Ana', status: 'balance', balance: 500 },
  { id: '3', number: '03', type: 'Single', tenant: null, status: 'vacant', balance: 0 },
  { id: '4', number: '04', type: 'Single', tenant: 'Joy', status: 'paid', balance: 0 },
  { id: '5', number: '05', type: 'Single', tenant: 'Lyn', status: 'balance', balance: 2500 },
  { id: '6', number: '06', type: 'Single', tenant: null, status: 'vacant', balance: 0 },
  { id: '7', number: '07', type: 'Single', tenant: 'Rose', status: 'paid', balance: 0 },
  { id: '8', number: '08', type: 'Single', tenant: 'Claire', status: 'paid', balance: 0 },
  { id: '9', number: '09', type: 'Single', tenant: 'Beth', status: 'balance', balance: 750 },
  { id: '10', number: '10', type: 'Single', tenant: 'Shei', status: 'paid', balance: 0 },
  { id: '11', number: '11', type: 'Single', tenant: 'Cel', status: 'paid', balance: 0 },
  { id: '12', number: '12', type: 'Single', tenant: 'Diane', status: 'balance', balance: 2500 },
  { id: '13', number: '13', type: 'Double', tenant: 'Tess', status: 'paid', balance: 0 },
  { id: '14', number: '14', type: 'Double', tenant: 'Karen', status: 'balance', balance: 3500 },
  { id: '15', number: '15', type: 'Double', tenant: null, status: 'vacant', balance: 0 },
  { id: '16', number: '16', type: 'Double', tenant: null, status: 'vacant', balance: 0 },
  { id: '17', number: '17', type: 'Double', tenant: 'Lisa', status: 'balance', balance: 1200 },
];

const MOCK_TENANTS = [
  { id: '1', name: 'Maria Santos', initials: 'MS', room: 1, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#ef4444' },
  { id: '2', name: 'Ana Reyes', initials: 'AR', room: 2, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 500, color: '#8b5cf6' },
  { id: '3', name: 'Joy Cruz', initials: 'JC', room: 4, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#3b82f6' },
  { id: '4', name: 'Lyn Bautista', initials: 'LB', room: 5, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 2500, color: '#10b981' },
  { id: '5', name: 'Rose Dela Cruz', initials: 'RD', room: 7, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#ef4444' },
  { id: '6', name: 'Claire Flores', initials: 'CF', room: 8, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#8b5cf6' },
  { id: '7', name: 'Beth Mendoza', initials: 'BM', room: 9, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 750, color: '#3b82f6' },
  { id: '8', name: 'Shei Ramos', initials: 'SR', room: 10, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#10b981' },
  { id: '9', name: 'Cel Garcia', initials: 'CG', room: 11, type: 'Single', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#f59e0b' },
  { id: '10', name: 'Diane Torres', initials: 'DT', room: 12, type: 'Single', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 2500, color: '#ec4899' },
  { id: '11', name: 'Tess Villanueva', initials: 'TV', room: 13, type: 'Double', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#06b6d4' },
  { id: '12', name: 'Karen Silva', initials: 'KS', room: 14, type: 'Double', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 3500, color: '#8b5cf6' },
  { id: '13', name: 'Lisa Mendez', initials: 'LM', room: 17, type: 'Double', dueDate: 'Oct 5, 2026', status: 'unpaid', balance: 1200, color: '#f59e0b' },
  { id: '14', name: 'Nina Reyes', initials: 'NR', room: 16, type: 'Double', dueDate: 'Oct 5, 2026', status: 'paid', balance: 0, color: '#10b981' },
];

const MOCK_REVENUE = {
  september: {
    expected: 39000,
    collected: 27500,
    outstanding: 11500,
    percentCollected: 71,
    rentCollected: 35750,
    electricityFees: 8248,
  },
};

const MOCK_MONTHLY_INCOME = [
  { month: 'May', amount: 38000 },
  { month: 'Jun', amount: 43000 },
  { month: 'Jul', amount: 48000 },
  { month: 'Aug', amount: 43000 },
  { month: 'Sep', amount: 44000 },
];

const MOCK_ISSUES = [
  { id: '1', title: 'Leaking faucet in bathroom', tenant: 'Ana Reyes', initials: 'AR', room: 'Room 2', date: 'Sep 12, 2026', status: 'pending', color: '#8b5cf6' },
  { id: '2', title: 'Faulty electrical outlet', tenant: 'Beth Mendoza', initials: 'BM', room: 'Room 9', date: 'Sep 10, 2026', status: 'in-progress', color: '#3b82f6' },
  { id: '3', title: 'Window latch broken', tenant: 'Joy Cruz', initials: 'JC', room: 'Room 4', date: 'Sep 8, 2026', status: 'resolved', color: '#3b82f6' },
  { id: '4', title: 'Ceiling fan not working', tenant: 'Lyn Bautista', initials: 'LB', room: 'Room 5', date: 'Sep 14, 2026', status: 'pending', color: '#10b981' },
];

// ─── Data Access Functions ───────────────────────────────────

export function getBoardingHouseConfig() {
  return BOARDING_HOUSE;
}

export function getRooms() {
  return MOCK_ROOMS;
}

export function getTenants() {
  return MOCK_TENANTS;
}

export function getUnpaidTenants() {
  return MOCK_TENANTS.filter((t) => t.status === 'unpaid');
}

export function getRevenue(month = 'september') {
  return MOCK_REVENUE[month] || MOCK_REVENUE.september;
}

export function getMonthlyIncome() {
  return MOCK_MONTHLY_INCOME;
}

export function getIssues() {
  return MOCK_ISSUES;
}

export function getOccupancyStats() {
  const totalRooms = MOCK_ROOMS.length;
  const occupied = MOCK_ROOMS.filter((r) => r.tenant !== null).length;
  const vacant = totalRooms - occupied;
  const rate = Math.round((occupied / totalRooms) * 100);
  return { totalRooms, occupied, vacant, rate };
}

export function getIssueStats() {
  const total = MOCK_ISSUES.length;
  const pending = MOCK_ISSUES.filter((i) => i.status === 'pending').length;
  const inProgress = MOCK_ISSUES.filter((i) => i.status === 'in-progress').length;
  const resolved = MOCK_ISSUES.filter((i) => i.status === 'resolved').length;
  return { total, pending, inProgress, resolved };
}

export function getUnpaidStats() {
  const unpaidTenants = MOCK_TENANTS.filter((t) => t.status === 'unpaid');
  const totalUnpaid = unpaidTenants.reduce((sum, t) => sum + t.balance, 0);
  return { count: unpaidTenants.length, total: totalUnpaid };
}

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

// ─── Announcements ───────────────────────────────────────────
const MOCK_ANNOUNCEMENTS = [
  {
    id: '1',
    category: 'Payment',
    date: 'Sep 15, 2026',
    title: 'October Rent Reminder',
    description: 'October rent is due on October 5, 2026. Please settle your balances on time to avoid late fees.',
    badgeColor: '#10b981',
    badgeBg: '#d1fae5',
  },
  {
    id: '2',
    category: 'Maintenance',
    date: 'Sep 14, 2026',
    title: 'Water Interruption Notice',
    description: 'Water supply will be interrupted on Sep 18 from 8AM–12PM for pipe maintenance. Store water in advance.',
    badgeColor: '#059669',
    badgeBg: '#d1fae5',
  },
  {
    id: '3',
    category: 'House Rules',
    date: 'Sep 10, 2026',
    title: 'Curfew Reminder',
    description: 'Please be reminded that curfew is strictly at 10PM. Gates will be locked promptly after.',
    badgeColor: '#059669',
    badgeBg: '#d1fae5',
  },
];

export function getAnnouncements() {
  return MOCK_ANNOUNCEMENTS;
}

// ─── Tenant-Specific Helpers (Default: Ana Reyes, Room 2) ─────

export function getCurrentTenant(id = '2') {
  const tenant = MOCK_TENANTS.find((t) => t.id === id) || MOCK_TENANTS[1];
  return {
    ...tenant,
    roomNumber: tenant.room,
    roomType: 'Single Occupancy',
    outstandingBalance: tenant.balance || 500,
    dueDate: tenant.dueDate || 'Oct 5, 2026',
  };
}

export function getTenantBillingBreakdown(id = '2') {
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

export function getTenantComplaints(tenantName = 'Ana Reyes') {
  return MOCK_ISSUES.filter((i) => i.tenant.toLowerCase() === tenantName.toLowerCase());
}

export function submitComplaint({ title, tenantName = 'Ana Reyes', room = 'Room 2' }) {
  const newComplaint = {
    id: String(MOCK_ISSUES.length + 1),
    title,
    tenant: tenantName,
    initials: 'AR',
    room,
    date: 'Sep 22, 2026',
    status: 'pending',
    color: '#8b5cf6',
  };
  MOCK_ISSUES.unshift(newComplaint);
  return newComplaint;
}

