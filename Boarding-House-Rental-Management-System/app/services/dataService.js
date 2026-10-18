/**
 * 3NF Data Service Layer
 * 
 * Reads and writes the app's relational tables through Supabase.
 * 
 * Uses Supabase when configured.
 * Gracefully falls back to in-memory 3NF mock store in demo mode.
 */

import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { COLLECTIONS } from './databaseSchema.js';
import { getNormalizedMockDatabase } from './seedDatabase.js';

// ─── Supabase Helpers ─────────────────────────────────────────

const TABLE_ALIASES = { [COLLECTIONS.USERS]: 'profiles' };
const TABLE_KEYS = { [COLLECTIONS.STAFF_PROFILES]: 'user_id' };

function getTableName(collectionName) {
  return TABLE_ALIASES[collectionName] || collectionName;
}

function getKeyColumn(collectionName) {
  return TABLE_KEYS[collectionName] || 'id';
}

function normalizeRow(collectionName, row) {
  if (!row) return row;
  if (collectionName === COLLECTIONS.STAFF_PROFILES) return { ...row, id: row.user_id };
  return row;
}

async function getCurrentUserId() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function readCollection(collectionName) {
  try {
    if (!supabase) return getNormalizedMockDatabase()[collectionName] || [];
    const { data, error } = await supabase.from(getTableName(collectionName)).select('*');
    if (error) throw error;
    return (data || []).map((row) => normalizeRow(collectionName, row));
  } catch (error) {
    console.warn(`Supabase read denied or failed for "${collectionName}":`, error.message || error);
    throw error;
  }
}

async function readWhere(collectionName, field, value) {
  if (!supabase) return (getNormalizedMockDatabase()[collectionName] || []).filter((row) => row[field] === value);
  const { data, error } = await supabase.from(getTableName(collectionName)).select('*').eq(field, value);
  if (error) throw error;
  return (data || []).map((row) => normalizeRow(collectionName, row));
}

async function writeDocument(collectionName, docId, data) {
  try {
    if (!supabase) return { id: docId, ...data };
    const keyColumn = getKeyColumn(collectionName);
    const row = { ...data, [keyColumn]: docId };
    delete row.id;
    if (keyColumn === 'id') row.id = docId;
    const { error } = await supabase.from(getTableName(collectionName)).upsert(row, { onConflict: keyColumn });
    if (error) throw error;
    return { id: docId, ...data };
  } catch (error) {
    console.error(`Error writing to Supabase table "${collectionName}" (${docId}):`, error);
    throw error;
  }
}

async function updateDocument(collectionName, docId, updates) {
  try {
    if (!supabase) return;
    const { error } = await supabase.from(getTableName(collectionName))
      .update(updates).eq(getKeyColumn(collectionName), docId);
    if (error) throw error;
  } catch (error) {
    console.error(`Error updating Supabase table "${collectionName}" (${docId}):`, error);
    throw error;
  }
}

// ─── Store Access (Supabase or In-Memory) ─────────────────────

async function getStore() {
  if (!isSupabaseConfigured || !supabase) {
    return getNormalizedMockDatabase();
  }

  const collectionNames = Object.values(COLLECTIONS);
  const results = await Promise.all(collectionNames.map(async (name) => [name, await readCollection(name)]));
  return Object.fromEntries(results);

}

// ─── Relational Join Helpers ─────────────────────────────────

function getInvoiceBalance(invoiceId, store) {
  try {
    const invoice = (store[COLLECTIONS.INVOICES] || []).find((inv) => inv.id === invoiceId);
    if (!invoice) return 0;

    const payments = (store[COLLECTIONS.PAYMENTS] || []).filter((p) => p.invoice_id === invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const balance = toMoney(getInvoiceTotalAmount(invoice) - totalPaid);
    return Math.max(0, balance);
  } catch (error) {
    console.error('Error computing invoice balance:', error);
    return 0;
  }
}

// Water is free, so exclude any legacy water charge from invoice totals.
// Legacy initial invoices may also contain a security-deposit amount.
function getInvoiceTotalAmount(invoice) {
  const total = Number(invoice?.total_amount) || 0;
  const water = Number(invoice?.water_charge) || 0;
  const securityDeposit = invoice?.invoice_type === 'initial' ? Number(invoice.security_deposit) || 0 : 0;
  const currentPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  if (invoice?.billing_period === currentPeriod) {
    return Math.max(0, (Number(invoice.rent_charge) || 0) + (Number(invoice.utility_charge) || 0) + 100 - water - securityDeposit);
  }
  return Math.max(0, total - water - securityDeposit);
}

const WIFI_CHARGE = { id: 'wifi', label: 'Wi-Fi', amount: 100 };

function addDaysToDate(date, days) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

function toMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getDateTimestamp(dateValue) {
  if (!dateValue) return null;
  let date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue.toDate === 'function') {
    date = dateValue.toDate();
  } else if (typeof dateValue.toMillis === 'function') {
    date = new Date(dateValue.toMillis());
  } else if (dateValue && typeof dateValue === 'object') {
    const seconds = Number(dateValue.seconds ?? dateValue._seconds);
    if (Number.isFinite(seconds)) {
      date = new Date(seconds * 1000);
    } else if (typeof dateValue.date === 'string') {
      date = new Date(dateValue.date);
    } else {
      return null;
    }
  } else if (typeof dateValue === 'string' && /^\d{10,13}$/.test(dateValue)) {
    const numericDate = Number(dateValue);
    date = new Date(dateValue.length === 10 ? numericDate * 1000 : numericDate);
  } else {
    date = new Date(dateValue);
  }
  const timestamp = date.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getPaymentDateTimestamp(payment) {
  for (const dateValue of [
    payment.payment_date,
    payment.paymentDate,
    payment.date,
    payment.paid_at,
    payment.paidAt,
    payment.created_at,
  ]) {
    const timestamp = getDateTimestamp(dateValue);
    if (timestamp !== null) return timestamp;
  }
  return null;
}

function getPaymentPeriod(payment) {
  const dateValue = payment.payment_date ?? payment.paymentDate ?? payment.date ?? payment.paid_at ?? payment.paidAt ?? payment.created_at;
  if (typeof dateValue === 'string') {
    const dateMatch = dateValue.match(/^(\d{4}-\d{2})/);
    if (dateMatch) return dateMatch[1];
  }

  const timestamp = getPaymentDateTimestamp(payment);
  if (timestamp === null) return null;
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentBillingPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function getFinancialCollections() {
  if (isSupabaseConfigured && supabase) {
    const [invoices, payments] = await Promise.all([
      readCollection(COLLECTIONS.INVOICES),
      readCollection(COLLECTIONS.PAYMENTS),
    ]);
    return { invoices, payments };
  }

  const store = await getStore();
  return {
    invoices: store[COLLECTIONS.INVOICES] || [],
    payments: store[COLLECTIONS.PAYMENTS] || [],
  };
}

function getLatestInvoiceForLease(invoices, leaseId) {
  return invoices
    .filter((invoice) => invoice.lease_id === leaseId)
    .sort((a, b) => String(b.billing_period || b.due_date || '').localeCompare(String(a.billing_period || a.due_date || ''))
      || Number(a.invoice_type === 'initial') - Number(b.invoice_type === 'initial'))[0] || null;
}

function formatRoomType(roomType) {
  if (!roomType) return 'Room';
  return roomType.name.includes('Single') ? 'Single' : 'Double';
}

function toRoomListItem(room, roomTypes, leases = [], tenants = [], invoices = [], payments = []) {
  const roomType = roomTypes.find((type) => type.id === room.type_id);
  const activeLease = leases.find((lease) => lease.room_id === room.id && lease.status === 'active');
  const tenant = activeLease ? tenants.find((item) => item.id === activeLease.tenant_id) : null;

  let balance = 0;
  let status = room.status === 'occupied' ? 'occupied' : 'vacant';

  if (activeLease && tenant) {
    const currentInvoice = invoices.find((invoice) => invoice.lease_id === activeLease.id);
    if (currentInvoice) {
      const totalPaid = payments
        .filter((payment) => payment.invoice_id === currentInvoice.id)
        .reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
      balance = Math.max(0, getInvoiceTotalAmount(currentInvoice) - totalPaid);
    }
    status = balance > 0 ? 'balance' : 'paid';
  }

  return {
    id: String(room.id).replace('room-', ''),
    number: room.room_number,
    type: formatRoomType(roomType),
    tenant: tenant ? tenant.first_name : null,
    status,
    balance,
    ...(room.reserved_for_name ? { reservedFor: room.reserved_for_name } : {}),
  };
}

async function getRoomsStore() {
  if (!isSupabaseConfigured || !supabase) return getStore();

  const [rooms, roomTypes, leases, tenants, invoices, payments] = await Promise.all([
    readCollection(COLLECTIONS.ROOMS),
    readCollection(COLLECTIONS.ROOM_TYPES),
    readCollection(COLLECTIONS.LEASES),
    readCollection(COLLECTIONS.TENANTS),
    readCollection(COLLECTIONS.INVOICES),
    readCollection(COLLECTIONS.PAYMENTS),
  ]);

  return { rooms, roomTypes, leases, tenants, invoices, payments };
}

// ─── 3NF Query Functions ─────────────────────────────────────

/**
 * 1. Property Configuration
 */
export async function getBoardingHouseConfig() {
  try {
    const store = await getStore();
    const houseList = store[COLLECTIONS.BOARDING_HOUSES] || [];
    const house = houseList[0] || { name: 'Boarding House', address: '', default_kwh_rate: 12.0 };
    return {
      name: house.name,
      address: house.address,
      monthlyRent: 2500,
      electricityRate: house.default_kwh_rate || 12.0,
    };
  } catch (error) {
    console.error('Error fetching boarding house config:', error);
    return { name: 'Boarding House', address: '', monthlyRent: 2500, electricityRate: 12.0 };
  }
}

/**
 * 2. Rooms List
 */
export async function getRooms() {
  const data = await getRoomsStore();
  const isLiveStore = isSupabaseConfigured && supabase;
  const rooms = isLiveStore ? data.rooms : (data[COLLECTIONS.ROOMS] || []);
  const roomTypes = isLiveStore ? data.roomTypes : (data[COLLECTIONS.ROOM_TYPES] || []);
  const leases = isLiveStore ? data.leases : (data[COLLECTIONS.LEASES] || []);
  const tenants = isLiveStore ? data.tenants : (data[COLLECTIONS.TENANTS] || []);
  const invoices = isLiveStore ? data.invoices : (data[COLLECTIONS.INVOICES] || []);
  const payments = isLiveStore ? data.payments : (data[COLLECTIONS.PAYMENTS] || []);

  return rooms.map((room) => toRoomListItem(room, roomTypes, leases, tenants, invoices, payments));
}

/** Room types available to the owner when adding a room. */
export async function getRoomTypes() {
  const store = isSupabaseConfigured && supabase ? null : await getStore();
  const roomTypes = isSupabaseConfigured && supabase
    ? await readCollection(COLLECTIONS.ROOM_TYPES)
    : (store[COLLECTIONS.ROOM_TYPES] || []);
  return roomTypes.map((type) => ({
    id: type.id,
    name: type.name,
    baseRent: type.base_rent,
    maxCapacity: type.max_capacity,
  })).sort((first, second) => (
    first.baseRent - second.baseRent || first.name.localeCompare(second.name)
  ));
}

/** Add a vacant room. Room creation is restricted to owner accounts by RLS. */
export async function addRoom({ roomNumber, typeId, reservedForName = '' }) {
  const normalizedNumber = String(roomNumber || '').trim().replace(/^0+/, '');
  if (!/^\d{1,4}$/.test(normalizedNumber)) {
    throw new Error('Enter a room number using 1 to 4 digits.');
  }

  const cleanReservedName = String(reservedForName || '').replace(/\s+/g, ' ').trim();
  if (cleanReservedName.length > 60) {
    throw new Error('Occupant name must be 60 characters or fewer.');
  }
  if (cleanReservedName && !/\p{L}/u.test(cleanReservedName)) {
    throw new Error('Occupant name must include at least one letter.');
  }

  const liveStore = isSupabaseConfigured && supabase;
  const store = liveStore ? null : await getStore();
  const [rooms, roomTypes, boardingHouses] = liveStore
    ? await Promise.all([
      readCollection(COLLECTIONS.ROOMS),
      readCollection(COLLECTIONS.ROOM_TYPES),
      readCollection(COLLECTIONS.BOARDING_HOUSES),
    ])
    : [
      store[COLLECTIONS.ROOMS] || [],
      store[COLLECTIONS.ROOM_TYPES] || [],
      store[COLLECTIONS.BOARDING_HOUSES] || [],
    ];
  const roomType = roomTypes.find((type) => type.id === typeId);
  if (!roomType) throw new Error('Choose a valid room type.');
  const boardingHouse = boardingHouses[0];
  if (!boardingHouse?.id) {
    throw new Error('No boarding house is configured. Apply the boarding house setup migration before adding rooms.');
  }

  const formattedNumber = normalizedNumber.padStart(2, '0');
  if (rooms.some((room) => String(parseInt(room.room_number, 10)) === normalizedNumber)) {
    throw new Error('A room with that number already exists.');
  }

  const roomId = `room-${Date.now()}`;
  const newRoom = {
    id: roomId,
    house_id: boardingHouse.id,
    room_number: formattedNumber,
    type_id: roomType.id,
    status: cleanReservedName ? 'occupied' : 'vacant',
    ...(cleanReservedName ? { reserved_for_name: cleanReservedName } : {}),
  };

  if (liveStore) {
    await writeDocument(COLLECTIONS.ROOMS, roomId, newRoom);
  } else {
    rooms.push(newRoom);
  }

  return newRoom;
}

/**
 * 3. Tenants List
 */
export async function getTenants() {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const room_types = store[COLLECTIONS.ROOM_TYPES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];

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
        id: String(tenant.id).replace('tenant-', ''),
        tenant_id: tenant.id,
        name: `${tenant.first_name} ${tenant.last_name}`,
        initials: tenant.initials,
        room: roomNum,
        type: roomType ? (roomType.name.includes('Single') ? 'Single' : 'Double') : 'Single',
        dueDate,
        status,
        balance,
        color: tenant.avatar_color || '#8b5cf6',
      };
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }
}

/**
 * 4. Unpaid Tenants
 */
export async function getUnpaidTenants() {
  try {
    const allTenants = await getTenants();
    return allTenants.filter((t) => t.status === 'unpaid');
  } catch (error) {
    console.error('Error fetching unpaid tenants:', error);
    return [];
  }
}

/**
 * 5. Monthly Revenue Aggregations
 */
export async function getRevenue(billingPeriod = getCurrentBillingPeriod()) {
  try {
    const period = /^\d{4}-\d{2}$/.test(billingPeriod) ? billingPeriod : getCurrentBillingPeriod();
    const { invoices, payments } = await getFinancialCollections();
    const periodInvoices = invoices.filter((invoice) => invoice.billing_period === period);
    const periodInvoiceIds = new Set(periodInvoices.map((invoice) => invoice.id));
    const allInvoiceIds = new Set(invoices.map((invoice) => invoice.id));
    const paidByInvoice = new Map();
    let collected = 0;

    payments.forEach((payment) => {
      const amount = Number(payment.amount_paid);
      if (!Number.isFinite(amount) || amount <= 0 || !allInvoiceIds.has(payment.invoice_id)) return;

      if (getPaymentPeriod(payment) === period) collected = toMoney(collected + amount);
      if (periodInvoiceIds.has(payment.invoice_id)) {
        paidByInvoice.set(payment.invoice_id, toMoney((paidByInvoice.get(payment.invoice_id) || 0) + amount));
      }
    });

    const expected = toMoney(periodInvoices.reduce((sum, invoice) => sum + getInvoiceTotalAmount(invoice), 0));
    const outstanding = toMoney(periodInvoices.reduce((sum, invoice) => {
      const paidForInvoice = paidByInvoice.get(invoice.id) || 0;
      return sum + Math.max(0, getInvoiceTotalAmount(invoice) - paidForInvoice);
    }, 0));
    const percentCollected = expected > 0
      ? Math.min(100, Math.round(((expected - outstanding) / expected) * 100))
      : 0;

    const rentBilled = toMoney(periodInvoices.reduce((sum, invoice) => sum + (Number(invoice.rent_charge) || 0), 0));
    const electricityFees = toMoney(periodInvoices.reduce((sum, invoice) => sum + (Number(invoice.utility_charge) || 0), 0));

    return {
      expected,
      collected,
      outstanding,
      percentCollected,
      rentBilled,
      electricityFees,
    };
  } catch (error) {
    console.error('Error computing revenue:', error);
    throw error;
  }
}

/**
 * 6. Historical Monthly Income
 */
export async function getMonthlyIncome(endPeriod = getCurrentBillingPeriod(), monthCount = 5) {
  try {
    const { invoices, payments } = await getFinancialCollections();
    const invoiceIds = new Set(invoices.map((invoice) => invoice.id));
    const [year, month] = endPeriod.split('-').map(Number);
    const periods = Array.from({ length: monthCount }, (_, index) => {
      const date = new Date(year, month - monthCount + index + 1, 1);
      return {
        period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        month: date.toLocaleDateString('en-US', { month: 'short' }),
      };
    });

    return periods.map(({ month: monthLabel, period }) => {
      const amount = payments
        .filter((payment) => invoiceIds.has(payment.invoice_id)
          && getPaymentPeriod(payment) === period
          && Number(payment.amount_paid) > 0)
        .reduce((sum, payment) => toMoney(sum + (Number(payment.amount_paid) || 0)), 0);
      return { month: monthLabel, period, amount };
    });
  } catch (error) {
    console.error('Error computing monthly income:', error);
    throw error;
  }
}

/**
 * 7. Complaints
 */
export async function getIssues() {
  try {
    const store = await getStore();
    const complaints = store[COLLECTIONS.COMPLAINTS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];

    return complaints.map((c) => {
      const tenant = tenants.find((t) => t.id === c.tenant_id);
      const room = rooms.find((r) => r.id === c.room_id);

      return {
        id: String(c.id).replace('comp-', ''),
        complaint_id: c.id,
        title: c.title,
        description: c.description || '',
        tenant: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant',
        initials: tenant ? tenant.initials : 'TN',
        room: room ? `Room ${parseInt(room.room_number, 10)}` : 'Room 1',
        date: c.filed_at,
        status: c.status,
        color: tenant ? tenant.avatar_color : '#8b5cf6',
      };
    });
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

/**
 * 8. Occupancy Statistics
 */
export async function getOccupancyStats() {
  try {
    const store = await getStore();
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const totalRooms = rooms.length;
    const occupiedRoomIds = new Set(leases.filter((l) => l.status === 'active').map((l) => l.room_id));
    rooms.forEach((r) => { if (r.status === 'occupied') occupiedRoomIds.add(r.id); });
    const occupied = occupiedRoomIds.size;
    const vacant = Math.max(0, totalRooms - occupied);
    const rate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    return { totalRooms, occupied, vacant, rate };
  } catch (error) {
    console.error('Error computing occupancy stats:', error);
    return { totalRooms: 17, occupied: 14, vacant: 3, rate: 82 };
  }
}

/**
 * 9. Issue Statistics
 */
export async function getIssueStats() {
  try {
    const store = await getStore();
    const complaints = store[COLLECTIONS.COMPLAINTS] || [];
    const total = complaints.length;
    const pending = complaints.filter((i) => i.status === 'pending').length;
    const inProgress = complaints.filter((i) => i.status === 'in-progress').length;
    const resolved = complaints.filter((i) => i.status === 'resolved').length;
    return { total, pending, inProgress, resolved };
  } catch (error) {
    console.error('Error computing issue stats:', error);
    return { total: 4, pending: 2, inProgress: 1, resolved: 1 };
  }
}

/**
 * 10. Unpaid Balances Statistics
 */
export async function getUnpaidStats() {
  try {
    const unpaidTenants = await getUnpaidTenants();
    const totalUnpaid = unpaidTenants.reduce((sum, t) => sum + t.balance, 0);
    return { count: unpaidTenants.length, total: totalUnpaid };
  } catch (error) {
    console.error('Error computing unpaid stats:', error);
    return { count: 0, total: 0 };
  }
}

/**
 * 11. Period Summary for Reports
 */
export async function getPeriodSummary(period = getCurrentBillingPeriod()) {
  try {
    const [store, revenue, occupancy] = await Promise.all([
      getStore(),
      getRevenue(period),
      getOccupancyStats(),
    ]);
    const complaints = store[COLLECTIONS.COMPLAINTS] || [];
    const periodComplaints = complaints.filter((complaint) => {
      const dateValue = complaint.filed_at || complaint.created_at;
      const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
      return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === period;
    });
    return {
      cashReceived: revenue.collected,
      rentBilled: revenue.rentBilled,
      unpaidBalance: revenue.outstanding,
      electricityFees: revenue.electricityFees,
      occupiedRooms: occupancy.occupied,
      totalRooms: occupancy.totalRooms,
      newComplaints: periodComplaints.length,
      resolved: periodComplaints.filter((complaint) => complaint.status === 'resolved').length,
    };
  } catch (error) {
    console.error('Error computing period summary:', error);
    throw error;
  }
}

// Backward-compatible alias for any older screen still using the previous report helper.
export async function getSeptemberSummary() {
  return getPeriodSummary('2026-09');
}

/**
 * 12. Announcements List
 */
export async function getAnnouncements() {
  try {
    const store = await getStore();
    const announcements = store[COLLECTIONS.ANNOUNCEMENTS] || [];
    return announcements.map((ann) => ({
      id: String(ann.id).replace('ann-', ''),
      announcement_id: ann.id,
      category: ann.category,
      date: ann.created_at,
      title: ann.title,
      description: ann.description,
      badgeColor: ann.category === 'Payment' ? '#10b981' : '#059669',
      badgeBg: '#d1fae5',
    }));
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return [];
  }
}

/**
 * 13. Tenant-specific profile lookup
 */
export async function getCurrentTenant(id = '2') {
  try {
    const tenantIdentifier = String(id || '2');
    const formattedId = tenantIdentifier.startsWith('tenant-') ? tenantIdentifier : `tenant-${tenantIdentifier}`;
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const tenant = tenants.find((t) => t.id === formattedId);
    if (!tenant) return null;

    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];

    const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
    const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
    const roomType = room ? roomTypes.find((type) => type.id === room.type_id) : null;
    const invoice = lease ? getLatestInvoiceForLease(invoices, lease.id) : null;
    const balance = invoice ? getInvoiceBalance(invoice.id, store) : 0;

    return {
      id: String(tenant.id).replace('tenant-', ''),
      tenant_id: tenant.id,
      name: `${tenant.first_name} ${tenant.last_name}`,
      initials: tenant.initials,
      accountStatus: tenant.account_status || 'pending',
      approvedAt: tenant.approved_at || null,
      rejectionReason: tenant.rejection_reason || '',
      registeredAt: tenant.registered_at || null,
      roomNumber: room ? parseInt(room.room_number, 10) : null,
      roomType: roomType?.name || null,
      outstandingBalance: balance,
      dueDate: invoice ? invoice.due_date : 'Pending room assignment',
      color: tenant.avatar_color,
    };
  } catch (error) {
    console.warn('Could not fetch current tenant:', error.message || error);
    return null;
  }
}

/** Load the editable personal fields for the signed-in tenant. */
export async function getTenantSettingsProfile(tenantId) {
  const uid = await getCurrentUserId();
  const tenants = isSupabaseConfigured && uid
    ? await readWhere(COLLECTIONS.TENANTS, 'user_id', uid)
    : (await getStore())[COLLECTIONS.TENANTS] || [];
  const tenant = tenants.find((item) => item.id === tenantId)
    || tenants.find((item) => item.user_id === uid);
  if (!tenant) throw new Error('Your tenant profile is not available. Please contact the property administrator.');

  return {
    id: tenant.id,
    firstName: tenant.first_name || '',
    lastName: tenant.last_name || '',
    phone: tenant.phone || '',
    emergencyContact: tenant.emergency_contact || '',
  };
}

/** Return a pending tenant's available initial room options. */
export async function getAvailableRoomsForInitialAssignment(tenantId) {
  const store = await getStore();
  const tenantKey = String(tenantId || '');
  const tenant = (store[COLLECTIONS.TENANTS] || []).find((item) => item.id === tenantKey);
  if (!tenant || tenant.account_status !== 'pending') return [];

  const leases = store[COLLECTIONS.LEASES] || [];
  if (leases.some((lease) => lease.tenant_id === tenantKey && lease.status === 'active')) return [];

  const occupiedRoomIds = new Set(leases.filter((lease) => lease.status === 'active').map((lease) => lease.room_id));
  const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
  return (store[COLLECTIONS.ROOMS] || [])
    .filter((room) => room.status === 'vacant' && !occupiedRoomIds.has(room.id))
    .map((room) => {
      const type = roomTypes.find((item) => item.id === room.type_id);
      return {
        id: room.id,
        number: room.room_number,
        type: type?.name || 'Room',
        estimatedRent: type?.base_rent || 0,
      };
    })
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
}

/** Return the tenant's initial room preference and its current review state. */
export async function getTenantRoomAssignmentRequest(tenantId) {
  const tenantKey = String(tenantId || '');
  if (isSupabaseConfigured && !supabase) {
    throw new Error('Supabase is required for room and payment setup. Check the Supabase project URL and publishable key.');
  }
  if (supabase) {
    const { data: request, error } = await supabase
      .from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
      .select('*')
      .eq('tenant_id', tenantKey)
      .maybeSingle();
    if (error) throw error;
    if (!request) return null;
    const store = await getStore();
    const room = (store[COLLECTIONS.ROOMS] || []).find((item) => item.id === request.requested_room_id);
    const roomType = (store[COLLECTIONS.ROOM_TYPES] || []).find((item) => item.id === room?.type_id);
    const paymentProofUrl = request.payment_proof_path
      ? await getInitialPaymentProofUrl(request.payment_proof_path)
      : '';
    return {
      id: request.id,
      requestedRoomId: request.requested_room_id,
      roomNumber: room?.room_number || null,
      roomType: roomType?.name || null,
      estimatedRent: roomType?.base_rent || 0,
      status: request.status,
      initialPaymentAmount: request.initial_payment_amount || null,
      paymentDate: request.payment_date || null,
      paymentReference: request.payment_reference || '',
      paymentProofPath: request.payment_proof_path || '',
      paymentProofUrl,
      paymentProofStatus: request.payment_proof_status || 'pending',
      requestedAt: request.requested_at,
      updatedAt: request.updated_at || null,
    };
  }

  const store = await getStore();
  const requests = store[COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS] || [];
  const request = requests
    .filter((item) => item.tenant_id === tenantKey)
    .sort((a, b) => (Date.parse(b.updated_at || b.requested_at) || 0) - (Date.parse(a.updated_at || a.requested_at) || 0))[0];
  if (!request) return null;

  const room = (store[COLLECTIONS.ROOMS] || []).find((item) => item.id === request.requested_room_id);
  const roomType = (store[COLLECTIONS.ROOM_TYPES] || []).find((item) => item.id === room?.type_id);
  return {
    id: request.id,
    requestedRoomId: request.requested_room_id,
    roomNumber: room?.room_number || null,
    roomType: roomType?.name || null,
    estimatedRent: roomType?.base_rent || 0,
    status: request.status,
    initialPaymentAmount: request.initial_payment_amount || null,
    paymentDate: request.payment_date || null,
    paymentReference: request.payment_reference || '',
    paymentProofUrl: request.payment_proof_data || request.payment_proof_url || '',
    paymentProofStatus: request.payment_proof_status || '',
    requestedAt: request.requested_at,
    updatedAt: request.updated_at || null,
  };
}

async function getInitialPaymentProofUrl(path) {
  if (!path) return '';
  if (/^(https?:\/\/|data:|file:|content:|blob:)/i.test(path)) {
    return /^(https?:\/\/|data:)/i.test(path) ? path : '';
  }
  const { data, error } = await supabase.storage
    .from('initial-payment-proofs')
    .createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

async function getPaymentProofUrl(path) {
  if (!path) return '';
  if (/^(https?:\/\/|data:|file:|content:|blob:)/i.test(path)) {
    return /^(https?:\/\/|data:)/i.test(path) ? path : '';
  }
  if (!supabase) return '';
  try {
    const { data, error } = await supabase.storage
      .from('initial-payment-proofs')
      .createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  } catch (error) {
    console.warn('Could not create a payment receipt preview URL:', error.message || error);
    return '';
  }
}

export async function getPaymentProofPreviewUrl(path) {
  if (!path) throw new Error('No receipt photo is attached to this payment proof.');
  if (/^(https?:\/\/|data:)/i.test(path)) return path;
  if (/^(file:|content:|blob:)/i.test(path)) {
    throw new Error("This receipt is saved only on the tenant's device. Ask the tenant to upload the receipt photo again.");
  }
  if (!supabase) throw new Error('Supabase is not configured, so the private receipt photo cannot be opened.');

  const { data, error } = await supabase.storage
    .from('initial-payment-proofs')
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.error('Could not create a payment receipt preview URL:', error);
    throw new Error(error.message || 'Could not access the receipt photo. Check Supabase storage permissions.');
  }
  return data.signedUrl;
}

/** Resize and upload a receipt image to the private Supabase bucket. */
export async function uploadInitialPaymentProof({ tenantId, asset }) {
  if (!asset?.uri) throw new Error('Choose a payment proof photo first.');
  if (!supabase) throw new Error('Supabase is not configured. Add its project URL and publishable key to the app environment.');
  const image = await manipulateAsync(
    asset.uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.65, format: SaveFormat.JPEG, base64: true }
  );
  if (!image.base64) throw new Error('Could not encode the selected receipt photo. Please choose another photo.');
  const imageBuffer = decode(image.base64);
  const imageBytes = new Uint8Array(imageBuffer);
  if (imageBytes.length < 3 || imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8 || imageBytes[2] !== 0xff) {
    throw new Error('The selected receipt photo could not be encoded as a JPEG. Please choose another photo.');
  }
  const objectPath = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage
    .from('initial-payment-proofs')
    .upload(objectPath, imageBuffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message || 'Could not upload the receipt photo to Supabase.');
  return objectPath;
}

/** Upload a receipt for an existing invoice using the private proof bucket. */
export async function uploadPaymentProof({ tenantId, asset }) {
  return uploadInitialPaymentProof({ tenantId, asset });
}

/** Submit or change a tenant's preferred initial room; staff still assign the room. */
export async function submitRoomAssignmentRequest({ tenantId, requestedRoomId, paymentAmount, paymentDate, paymentReference, paymentProofPath }) {
  const tenantKey = String(tenantId || '');
  if (isSupabaseConfigured && !supabase) {
    throw new Error('Supabase is required for room and payment setup. Check the Supabase project URL and publishable key.');
  }
  const store = await getStore();
  const tenant = (store[COLLECTIONS.TENANTS] || []).find((item) => item.id === tenantKey);
  if (!tenant) throw new Error('Your tenant profile is not available. Please sign in again.');
  if (tenant.account_status !== 'pending') throw new Error('Room preferences are available while your application is awaiting approval.');
  if ((store[COLLECTIONS.LEASES] || []).some((lease) => lease.tenant_id === tenantKey && lease.status === 'active')) {
    throw new Error('You already have an active room assignment.');
  }

  const room = (store[COLLECTIONS.ROOMS] || []).find((item) => item.id === requestedRoomId && item.status === 'vacant');
  if (!room) throw new Error('That room is no longer available. Refresh the list and choose another room.');
  const occupiedRoomIds = new Set((store[COLLECTIONS.LEASES] || []).filter((lease) => lease.status === 'active').map((lease) => lease.room_id));
  if (occupiedRoomIds.has(room.id)) throw new Error('That room is already assigned. Choose another room.');
  const roomType = (store[COLLECTIONS.ROOM_TYPES] || []).find((item) => item.id === room.type_id);
  const expectedAmount = Number(roomType?.base_rent || 0);
  if (!paymentProofPath) throw new Error('Attach proof of your one month advance.');
  if (!paymentDate) throw new Error('Enter the date you paid.');
  if (!Number.isFinite(Number(paymentAmount)) || Number(paymentAmount) <= 0) throw new Error('Enter a valid payment amount.');
  if (expectedAmount > 0 && Number(paymentAmount) !== expectedAmount) {
    throw new Error(`The amount for this room should be ₱${expectedAmount.toLocaleString()} (one month advance).`);
  }

  const requestId = `assignment-${tenantKey}`;
  let existing = null;
  if (supabase) {
    const { data, error } = await supabase.from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
      .select('id,status,requested_at').eq('id', requestId).maybeSingle();
    if (error) throw error;
    existing = data;
  } else {
    existing = (store[COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS] || []).find((item) => item.id === requestId);
  }
  if (existing?.status === 'approved') throw new Error('Your room has already been assigned.');
  const now = new Date().toISOString();
  const request = {
    id: requestId,
    tenant_id: tenantKey,
    requested_room_id: room.id,
    initial_payment_amount: Number(paymentAmount),
    payment_date: paymentDate,
    payment_reference: paymentReference || '',
    payment_proof_path: paymentProofPath,
    payment_proof_status: 'pending',
    status: 'pending',
    requested_at: existing?.requested_at || now,
    updated_at: now,
  };

  if (isSupabaseConfigured && !supabase) {
    throw new Error('Supabase is not ready. Check the Supabase project URL and publishable key.');
  }
  if (supabase) {
    const { error } = await supabase.from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
      .upsert(request, { onConflict: 'id' });
    if (error) throw new Error(error.message || 'Could not save the room and payment setup to Supabase.');
  } else {
    const mockStore = getNormalizedMockDatabase();
    const requests = mockStore[COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS] ||
      (mockStore[COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS] = []);
    const index = requests.findIndex((item) => item.id === requestId);
    if (index >= 0) requests[index] = request;
    else requests.unshift(request);
  }

  return {
    id: requestId,
    requestedRoomId: room.id,
    roomNumber: room.room_number,
    roomType: roomType?.name || 'Room',
    estimatedRent: roomType?.base_rent || 0,
    initialPaymentAmount: request.initial_payment_amount,
    paymentDate: request.payment_date,
    paymentReference: request.payment_reference,
    paymentProofPath: request.payment_proof_path,
    paymentProofUrl: supabase ? await getInitialPaymentProofUrl(request.payment_proof_path) : '',
    paymentProofStatus: request.payment_proof_status,
    status: 'pending',
    requestedAt: request.requested_at,
    updatedAt: now,
  };
}

/**
 * 14. Tenant Billing Breakdown
 */
export async function getTenantBillingBreakdown(id = '2') {
  try {
    const tenantIdentifier = String(id || '2');
    const formattedId = tenantIdentifier.startsWith('tenant-') ? tenantIdentifier : `tenant-${tenantIdentifier}`;
    const store = await getStore();
    const leases = store[COLLECTIONS.LEASES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];

    const lease = leases.find((l) => l.tenant_id === formattedId && l.status === 'active');
    const leaseInvoices = lease ? invoices.filter((item) => item.lease_id === lease.id) : [];
    const invoice = lease
      ? leaseInvoices
        .filter((item) => getInvoiceBalance(item.id, store) > 0)
        .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')))[0]
        || getLatestInvoiceForLease(invoices, lease.id)
      : null;
    const totalOutstanding = leaseInvoices.reduce((total, item) => total + getInvoiceBalance(item.id, store), 0);

    if (invoice) {
      const invPayments = payments.filter((p) => p.invoice_id === invoice.id);
      const paidAmount = invPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const totalDue = getInvoiceTotalAmount(invoice);
      const outstanding = Math.max(0, totalDue - paidAmount);
      const latestPayment = [...invPayments].sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')))[0];

      return {
        invoiceId: invoice.id,
        totalOutstanding,
        month: invoice.billing_period
          ? new Date(`${invoice.billing_period}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Current period',
        monthlyRent: invoice.rent_charge,
        electricity: invoice.utility_charge,
        securityDeposit: 0,
        invoiceType: invoice.invoice_type || 'monthly',
        water: 0,
        additionalCharges: invoice.billing_period === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
          ? [WIFI_CHARGE]
          : Array.isArray(invoice.additional_charges)
            ? invoice.additional_charges
            : Number(invoice.other_charges || 0) > 0
              ? [{ id: 'legacy-other', label: 'Other charges', amount: Number(invoice.other_charges) }]
              : [],
        totalDue,
        dueDate: invoice.due_date,
        paidAmount,
        receiptAmount: latestPayment?.amount_paid || 0,
        outstanding,
        receiptNumber: latestPayment?.reference_no || null,
        paymentDate: latestPayment?.payment_date || null,
        paymentMethod: latestPayment?.payment_method || null,
      };
    }

    return {
      invoiceId: null,
      month: '',
      monthlyRent: 0,
      electricity: 0,
      securityDeposit: 0,
      invoiceType: null,
      water: 0,
      additionalCharges: [],
      totalDue: 0,
      dueDate: 'Pending room assignment',
      paidAmount: 0,
      outstanding: 0,
      totalOutstanding,
    };
  } catch (error) {
    console.warn('Could not fetch billing breakdown:', error.message || error);
    return { invoiceId: null, month: '', monthlyRent: 0, electricity: 0, securityDeposit: 0, invoiceType: null, water: 0, additionalCharges: [], totalDue: 0, dueDate: 'Pending room assignment', paidAmount: 0, outstanding: 0, totalOutstanding: 0 };
  }
}

/**
 * Room-change requests for a tenant.
 */
export async function getAvailableRoomsForChange(tenantId) {
  const store = await getStore();
  const tenantKey = String(tenantId || '');
  const leases = store[COLLECTIONS.LEASES] || [];
  const lease = leases.find((item) => item.tenant_id === tenantKey && item.status === 'active');
  const currentRoom = lease && (store[COLLECTIONS.ROOMS] || []).find((room) => room.id === lease.room_id);
  const occupiedRoomIds = new Set(leases.filter((item) => item.status === 'active').map((item) => item.room_id));
  const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];

  return (store[COLLECTIONS.ROOMS] || [])
    .filter((room) => room.status === 'vacant' && !occupiedRoomIds.has(room.id) &&
      (!currentRoom || room.house_id === currentRoom.house_id))
    .map((room) => {
      const type = roomTypes.find((item) => item.id === room.type_id);
      return {
        id: room.id,
        number: room.room_number,
        type: type?.name || 'Room',
        monthlyRent: type?.base_rent || 0,
      };
    });
}

export async function getTenantRoomChangeRequests(tenantId) {
  const store = await getStore();
  const tenantKey = String(tenantId || '');
  const requests = store[COLLECTIONS.ROOM_CHANGE_REQUESTS] || [];
  const rooms = store[COLLECTIONS.ROOMS] || [];
  const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
  return requests
    .filter((request) => request.tenant_id === tenantKey)
    .sort((a, b) => (Date.parse(b.requested_at) || 0) - (Date.parse(a.requested_at) || 0))
    .map((request) => {
      const room = rooms.find((item) => item.id === request.requested_room_id);
      const type = roomTypes.find((item) => item.id === room?.type_id);
      return {
        id: request.id,
        roomNumber: room?.room_number ?? '-',
        roomType: type?.name || 'Room',
        reason: request.reason || '',
        status: request.status,
        date: request.requested_at,
      };
    });
}

export async function submitRoomChangeRequest({ requestedRoomId, reason, tenantId }) {
  const store = await getStore();
  const tenantKey = String(tenantId || '');
  const tenant = (store[COLLECTIONS.TENANTS] || []).find((item) => item.id === tenantKey);
  if (!tenant) throw new Error('Your tenant profile is not available. Please sign in again.');

  const lease = (store[COLLECTIONS.LEASES] || []).find(
    (item) => item.tenant_id === tenant.id && item.status === 'active'
  );
  if (!lease) throw new Error('Your active lease could not be found. Please contact the property administrator.');

  const room = (store[COLLECTIONS.ROOMS] || []).find(
    (item) => item.id === requestedRoomId && item.status === 'vacant'
  );
  if (!room) throw new Error('That room is no longer available. Please reload the room options.');

  const existing = (store[COLLECTIONS.ROOM_CHANGE_REQUESTS] || []).find(
    (item) => item.tenant_id === tenant.id && item.status === 'pending'
  );
  if (existing) throw new Error('You already have a pending room-change request.');

  const requestId = 'room-change-' + Date.now();
  const request = {
    id: requestId,
    tenant_id: tenant.id,
    current_room_id: lease.room_id,
    requested_room_id: room.id,
    reason: String(reason || '').trim(),
    status: 'pending',
    requested_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  if (isSupabaseConfigured && supabase) {
    await writeDocument(COLLECTIONS.ROOM_CHANGE_REQUESTS, requestId, request);
  } else {
    const mockStore = getNormalizedMockDatabase();
    const requests = mockStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] ||
      (mockStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] = []);
    requests.unshift(request);
  }

  const type = (store[COLLECTIONS.ROOM_TYPES] || []).find((item) => item.id === room.type_id);
  return {
    id: request.id,
    roomNumber: room.room_number,
    roomType: type?.name || 'Room',
    reason: request.reason,
    status: request.status,
    date: request.requested_at,
  };
}
/**
 * 15. Tenant Complaints Scoped View
 */
export async function getTenantComplaints(tenantId) {
  try {
    const store = await getStore();
    const complaints = store[COLLECTIONS.COMPLAINTS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const tenant = tenants.find((t) => t.id === tenantId);

    if (!tenant) return [];

    return complaints
      .filter((c) => c.tenant_id === tenant.id)
      .map((c) => ({
        id: String(c.id).replace('comp-', ''),
        complaint_id: c.id,
        title: c.title,
        description: c.description || '',
        tenant: `${tenant.first_name} ${tenant.last_name}`,
        initials: tenant.initials,
        room: '',
        date: c.filed_at,
        status: c.status,
        color: tenant.avatar_color,
      }));
  } catch (error) {
    console.error('Error fetching tenant complaints:', error);
    throw error;
  }
}

/** Remove a resolved complaint from the tenant's complaint history. */
export async function deleteResolvedTenantComplaint(complaintId, tenantId) {
  if (!complaintId || !tenantId) throw new Error('Complaint could not be identified.');
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from(COLLECTIONS.COMPLAINTS)
        .delete()
        .eq('id', complaintId)
        .eq('tenant_id', tenantId)
        .eq('status', 'resolved')
        .select('id');
      if (error) throw error;
      if (!data?.length) {
        throw new Error('Supabase did not delete this complaint. Apply the tenant resolved-complaint delete policy migration and confirm this complaint belongs to your account.');
      }
    } else {
      const mockStore = getNormalizedMockDatabase();
      const complaints = mockStore[COLLECTIONS.COMPLAINTS] || [];
      const index = complaints.findIndex((item) => item.id === complaintId
        && item.tenant_id === tenantId && item.status === 'resolved');
      if (index < 0) throw new Error('Only your resolved complaints can be removed.');
      complaints.splice(index, 1);
    }
  } catch (error) {
    console.error('Error removing resolved tenant complaint:', error);
    throw new Error(error.message || 'Could not remove this resolved complaint. Please try again.');
  }
}

/**
 * 16. Submit Complaint (Direct to Supabase)
 */
export async function submitComplaint({ title, description = '', tenantId }) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];

    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Your tenant profile is not available yet. Please contact the property administrator.');
    const activeLease = (store[COLLECTIONS.LEASES] || []).find((lease) => lease.tenant_id === tenant.id && lease.status === 'active');
    if (!activeLease) throw new Error('Your room has not been assigned yet. You can submit a complaint after assignment.');
    const roomDoc = rooms.find((r) => r.id === activeLease.room_id);
    if (!roomDoc) throw new Error('Your assigned room could not be found. Please contact the property administrator.');

    const newId = `comp-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newComplaint = {
      id: newId,
      tenant_id: tenant.id,
      room_id: roomDoc.id,
      title,
      description,
      status: 'pending',
      filed_at: dateStr,
    };

    if (isSupabaseConfigured && supabase) {
      await writeDocument(COLLECTIONS.COMPLAINTS, newId, newComplaint);
    } else {
      const mockStore = getNormalizedMockDatabase();
      mockStore[COLLECTIONS.COMPLAINTS].unshift(newComplaint);
    }

    return {
      id: newId.replace('comp-', ''),
      complaint_id: newId,
      title,
      description,
      tenant: `${tenant.first_name} ${tenant.last_name}`,
      initials: tenant.initials,
      room: `Room ${roomDoc.room_number}`,
      date: dateStr,
      status: 'pending',
      color: tenant.avatar_color,
    };
  } catch (error) {
    if (error?.code) console.error('Error submitting complaint:', error);
    throw new Error(error.message || 'Failed to submit complaint. Please try again.');
  }
}

/**
 * 17. Billing data: Rent billing list
 */
export async function getRentBilling(billingPeriod = getCurrentBillingPeriod()) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const utilityReadings = store[COLLECTIONS.UTILITY_READINGS] || [];

    return tenants
      .filter((tenant) => {
        const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
        return !!lease;
      })
      .map((tenant) => {
        const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
        const room = rooms.find((r) => r.id === lease.room_id);
        const roomType = roomTypes.find((type) => type.id === room?.type_id);
        const periodInvoices = invoices.filter((item) => item.lease_id === lease.id && item.billing_period === billingPeriod);
        const invoice = periodInvoices.find((item) => item.invoice_type !== 'initial')
          || periodInvoices.find((item) => item.invoice_type === 'initial')
          || null;
        const reading = utilityReadings.find((item) => item.room_id === lease.room_id && item.billing_period === billingPeriod);
        const balance = invoice ? getInvoiceBalance(invoice.id, store) : 0;
        const paidAmount = invoice ? Math.max(0, getInvoiceTotalAmount(invoice) - balance) : 0;
        const status = !invoice ? 'unbilled' : balance === 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid';
        const rent = invoice?.rent_charge ?? lease.agreed_monthly_rent ?? roomType?.base_rent ?? 0;
        const electricity = invoice?.utility_charge ?? calculateElectricityCharge(reading).amount;
        const totalAmount = invoice
          ? getInvoiceTotalAmount(invoice)
          : Number(rent) + electricity + (billingPeriod === getCurrentBillingPeriod() ? WIFI_CHARGE.amount : 0);

        return {
          id: String(tenant.id).replace('tenant-', ''),
          tenantId: tenant.id,
          name: `${tenant.first_name} ${tenant.last_name}`,
          initials: tenant.initials,
          room: room ? `R${parseInt(room.room_number, 10)}` : 'R?',
          roomNumber: room?.room_number || '?',
          dueDate: invoice ? String(invoice.due_date || '') : 'Not billed',
          amount: rent,
          totalAmount,
          balance,
          status,
          color: tenant.avatar_color || '#8b5cf6',
        };
      });
  } catch (error) {
    console.error('Error fetching rent billing:', error);
    return [];
  }
}

function calculateElectricityCharge(reading) {
  if (!reading || String(reading.prev_kwh ?? '').trim() === '' || String(reading.curr_kwh ?? '').trim() === '') {
    return { hasValidReading: false, usage: 0, rate: 12, amount: 0 };
  }

  const previousKwh = Number(reading.prev_kwh);
  const currentKwh = Number(reading.curr_kwh);
  if (!Number.isFinite(previousKwh) || !Number.isFinite(currentKwh) || currentKwh < previousKwh) {
    return { hasValidReading: false, usage: 0, rate: 12, amount: 0 };
  }

  const rawRate = String(reading.rate_per_kwh ?? '').trim();
  const parsedRate = Number(reading.rate_per_kwh);
  const rate = rawRate !== '' && Number.isFinite(parsedRate) && parsedRate >= 0 ? parsedRate : 12;
  const usage = currentKwh - previousKwh;
  return { hasValidReading: true, usage, rate, amount: Math.round(usage * rate) };
}

/**
 * 23. Billing data: Utility bills list
 */
export async function getUtilityBills() {
  try {
    const store = await getStore();
    const utility_readings = store[COLLECTIONS.UTILITY_READINGS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];

    const activeLeases = leases.filter((lease) => lease.status === 'active');
    const billRefs = [];
    invoices.filter((invoice) => invoice.invoice_type !== 'initial').forEach((invoice) => {
      const lease = leases.find((item) => item.id === invoice.lease_id);
      if (lease) {
        billRefs.push({ lease, invoice, reading: utility_readings.find((item) => item.room_id === lease.room_id && item.billing_period === invoice.billing_period) || null });
      }
    });
    utility_readings.forEach((reading) => {
      const lease = activeLeases.find((item) => item.room_id === reading.room_id);
      if (!lease || billRefs.some((item) => item.lease.id === lease.id && (item.invoice?.billing_period || item.reading?.billing_period) === reading.billing_period)) return;
      billRefs.push({ lease, invoice: null, reading });
    });

    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    activeLeases.forEach((lease) => {
      if (!billRefs.some((item) => item.lease.id === lease.id && (item.invoice?.billing_period || item.reading?.billing_period) === currentPeriod)) {
        billRefs.push({ lease, invoice: null, reading: null, billingPeriod: currentPeriod });
      }
    });

    return billRefs.map(({ lease, invoice, reading, billingPeriod }) => {
      const room = rooms.find((item) => item.id === lease.room_id);
      const roomType = roomTypes.find((item) => item.id === room?.type_id);
      const tenant = tenants.find((item) => item.id === lease.tenant_id);
      const electricityResult = calculateElectricityCharge(reading);
      const usage = electricityResult.usage;
      const electricity = invoice?.utility_charge ?? electricityResult.amount;
      const water = 0;
      const rent = invoice?.rent_charge ?? lease.agreed_monthly_rent ?? roomType?.base_rent ?? 0;
      const isCurrentBillingPeriod = (invoice?.billing_period || reading?.billing_period || billingPeriod) === currentPeriod;
      const additionalCharges = isCurrentBillingPeriod ? [WIFI_CHARGE] : [];
      const additionalTotal = additionalCharges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
      const invoiceTotal = invoice ? getInvoiceTotalAmount(invoice) : rent + electricity + additionalTotal;
      const invoicePaid = invoice
        ? (store[COLLECTIONS.PAYMENTS] || [])
          .filter((payment) => payment.invoice_id === invoice.id)
          .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0)
        : 0;
      return {
        id: `${lease.id}-${invoice?.billing_period || reading?.billing_period || billingPeriod || 'current'}`,
        leaseId: lease.id,
        invoiceId: invoice?.id || null,
        billingPeriod: invoice?.billing_period || reading?.billing_period || billingPeriod || 'Current period',
        roomNumber: room?.room_number || '—',
        name: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Vacant',
        initials: tenant?.initials || '--',
        prevKwh: reading?.prev_kwh ?? '—',
        currKwh: reading?.curr_kwh ?? '—',
        usage,
        hasValidReading: electricityResult.hasValidReading,
        ratePerKwh: electricityResult.rate,
        calculatedElectricity: electricityResult.amount,
        rent,
        electricity,
        water,
        additionalCharges,
        total: invoiceTotal,
        status: invoice
          ? invoicePaid >= invoiceTotal ? 'paid' : invoicePaid > 0 ? 'partial' : 'unpaid'
          : 'unbilled',
        color: tenant?.avatar_color || '#999',
      };
    }).sort((a, b) => String(b.billingPeriod).localeCompare(String(a.billingPeriod)) || String(a.roomNumber).localeCompare(String(b.roomNumber)));
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    return [];
  }
}

/** Update an existing utility bill or create the period invoice for an active lease. */
export async function updateUtilityBill({ invoiceId, leaseId, billingPeriod, monthlyRent, consumedKwh, ratePerKwh }) {
  if (!invoiceId && !leaseId) throw new Error('Select a room before creating its bill.');
  if ([monthlyRent, consumedKwh, ratePerKwh].some((value) => String(value).trim() === '')) {
    throw new Error('Enter rent, total kWh consumed, and the rate per kWh. Use 0 if a value does not apply.');
  }
  const values = [monthlyRent, consumedKwh, ratePerKwh].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('Rent, kWh consumed, and the rate per kWh must be valid non-negative amounts.');
  }
  const [rentCharge, usage, rate] = values;
  const electricityCharge = Math.round(usage * rate);
  const store = await getStore();
  let invoice = (store[COLLECTIONS.INVOICES] || []).find((item) => item.id === invoiceId);
  if (invoiceId && !invoice) throw new Error('The bill could not be found. Refresh and try again.');
  const lease = invoice
    ? (store[COLLECTIONS.LEASES] || []).find((item) => item.id === invoice.lease_id)
    : (store[COLLECTIONS.LEASES] || []).find((item) => item.id === leaseId && item.status === 'active');
  if (!lease) throw new Error('This room has no lease available for billing. Refresh and try again.');
  const period = billingPeriod || invoice?.billing_period || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const readings = store[COLLECTIONS.UTILITY_READINGS] || [];
  const reading = readings.find((item) => item.room_id === lease.room_id && item.billing_period === period);
  const previousKwh = Number(reading?.prev_kwh) || 0;
  const readingId = reading?.id || `reading-${Date.now()}`;
  const readingUpdates = {
    room_id: lease.room_id,
    billing_period: period,
    prev_kwh: previousKwh,
    curr_kwh: previousKwh + usage,
    rate_per_kwh: rate,
    reading_date: new Date().toISOString().slice(0, 10),
  };
  if (isSupabaseConfigured && supabase) {
    if (reading) await updateDocument(COLLECTIONS.UTILITY_READINGS, readingId, readingUpdates);
    else await writeDocument(COLLECTIONS.UTILITY_READINGS, readingId, { ...readingUpdates, id: readingId });
  } else if (reading) {
    Object.assign(reading, readingUpdates);
  } else {
    readings.push({ id: readingId, ...readingUpdates });
    store[COLLECTIONS.UTILITY_READINGS] = readings;
  }
  if (!invoice) {
    const [year, month] = period.split('-').map(Number);
    const dueDate = new Date(year, month, 1);
    const dueDay = Math.max(1, Number(lease.due_day_of_month) || 5);
    dueDate.setDate(Math.min(dueDay, new Date(year, month + 1, 0).getDate()));
    const newId = `invoice-${Date.now()}`;
    invoice = {
      id: newId,
      lease_id: lease.id,
      billing_period: period,
      invoice_type: 'monthly',
      rent_charge: rentCharge,
      utility_charge: electricityCharge,
      water_charge: 0,
      security_deposit: 0,
      other_charges: WIFI_CHARGE.amount,
      additional_charges: [WIFI_CHARGE],
      total_amount: rentCharge + electricityCharge + WIFI_CHARGE.amount,
      due_date: dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'unpaid',
      created_at: new Date().toISOString(),
      notes: `${period} billing: Rent and electricity`,
    };
    if (isSupabaseConfigured && supabase) {
      await writeDocument(COLLECTIONS.INVOICES, newId, invoice);
    } else {
      store[COLLECTIONS.INVOICES].push(invoice);
    }
    return invoice;
  }
  const totalAmount = rentCharge + electricityCharge + WIFI_CHARGE.amount;
  const totalPaid = (store[COLLECTIONS.PAYMENTS] || [])
    .filter((payment) => payment.invoice_id === invoiceId)
    .reduce((sum, payment) => sum + Number(payment.amount_paid || 0), 0);

  const updates = {
    rent_charge: rentCharge,
    utility_charge: electricityCharge,
    water_charge: 0,
    security_deposit: 0,
    additional_charges: [WIFI_CHARGE],
    other_charges: WIFI_CHARGE.amount,
    total_amount: totalAmount,
    status: totalAmount > 0 && totalPaid >= totalAmount ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid',
  };

  if (isSupabaseConfigured && supabase) {
    await updateDocument(COLLECTIONS.INVOICES, invoiceId, updates);
  } else {
    Object.assign(invoice, updates);
  }

  return { ...invoice, ...updates };
}

/**
 * 24. Caretaker dashboard stats
 */
export async function getCaretakerDashboardData() {
  try {
    const store = await getStore();
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const complaints = store[COLLECTIONS.COMPLAINTS] || [];
    const announcements = store[COLLECTIONS.ANNOUNCEMENTS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];

    const totalRooms = rooms.length;
    const singleRooms = rooms.filter((r) => r.type_id === 'type-single').length;
    const doubleRooms = rooms.filter((r) => r.type_id === 'type-double').length;
    const occupied = leases.filter((l) => l.status === 'active').length;
    const vacant = Math.max(0, totalRooms - occupied);
    const rate = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0;

    const unpaidTenants = await getUnpaidTenants();
    const totalUnpaid = unpaidTenants.reduce((sum, t) => sum + t.balance, 0);

    const pendingComplaints = complaints.filter((c) => c.status === 'pending');
    const pendingIssues = pendingComplaints.map((c) => {
      const tenant = tenants.find((t) => t.id === c.tenant_id);
      const room = rooms.find((r) => r.id === c.room_id);
      return {
        id: c.id,
        room: room ? `R${parseInt(room.room_number, 10)}` : 'R?',
        issue: c.title,
        tenant: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant',
        date: c.filed_at,
      };
    });

    const latestAnnouncement = announcements.length > 0 ? announcements[0] : null;

    return {
      totalRooms,
      singleRooms,
      doubleRooms,
      occupied,
      vacant,
      rate,
      unpaidCount: unpaidTenants.length,
      totalUnpaid,
      pendingIssueCount: pendingComplaints.length,
      pendingIssues,
      latestAnnouncement,
    };
  } catch (error) {
    console.error('Error fetching caretaker dashboard data:', error);
    return {
      totalRooms: 17,
      singleRooms: 12,
      doubleRooms: 5,
      occupied: 14,
      vacant: 3,
      rate: 82,
      unpaidCount: 6,
      totalUnpaid: 11500,
      pendingIssueCount: 2,
      pendingIssues: [],
      latestAnnouncement: null,
    };
  }
}

/**
 * 25. Add a new announcement (Direct to Supabase)
 */
export async function addAnnouncement({ category, title, description }) {
  try {
    const newId = `ann-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const boardingHouses = isSupabaseConfigured && supabase
      ? await readCollection(COLLECTIONS.BOARDING_HOUSES)
      : (getNormalizedMockDatabase()[COLLECTIONS.BOARDING_HOUSES] || []);
    const newAnnouncement = {
      id: newId,
      // Associate announcements with an actual configured property when one exists.
      // Null keeps global announcements valid before property setup is complete.
      house_id: boardingHouses[0]?.id || null,
      author_user_id: await getCurrentUserId(),
      category,
      title,
      description,
      created_at: dateStr,
    };

    if (isSupabaseConfigured && supabase) {
      await writeDocument(COLLECTIONS.ANNOUNCEMENTS, newId, newAnnouncement);
    } else {
      const mockStore = getNormalizedMockDatabase();
      mockStore[COLLECTIONS.ANNOUNCEMENTS].unshift(newAnnouncement);
    }

    return {
      id: newId.replace('ann-', ''),
      announcement_id: newId,
      category,
      date: dateStr,
      title,
      description,
      badgeColor: category === 'Payment' ? '#10b981' : '#059669',
      badgeBg: '#d1fae5',
    };
  } catch (error) {
    console.error('Error adding announcement:', error);
    throw new Error('Failed to add announcement. Please try again.');
  }
}

/**
 * 26. Update complaint status (Direct to Supabase)
 */
export async function updateComplaintStatus(complaintId, newStatus) {
  try {
    const formattedId = complaintId.startsWith('comp-') ? complaintId : `comp-${complaintId}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (isSupabaseConfigured && supabase) {
      const updates = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.resolved_at = dateStr;
      }
      await updateDocument(COLLECTIONS.COMPLAINTS, formattedId, updates);
    } else {
      const mockStore = getNormalizedMockDatabase();
      const complaint = (mockStore[COLLECTIONS.COMPLAINTS] || []).find((c) => c.id === formattedId);
      if (complaint) {
        complaint.status = newStatus;
        if (newStatus === 'resolved') {
          complaint.resolved_at = dateStr;
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating complaint status:', error);
    throw new Error('Failed to update complaint. Please try again.');
  }
}

// ═══════════════════════════════════════════════════════════════
// TENANT ONBOARDING & FINANCIAL MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * 26.5. Get vacant rooms available for tenant assignment
 */
export async function getVacantRoomsForAssignment() {
  try {
    const store = await getStore();
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
    
    return rooms
      .filter((room) => room.status === 'vacant')
      .map((room) => {
        const type = roomTypes.find((rt) => rt.id === room.type_id);
        return {
          id: room.id,
          roomNumber: room.room_number,
          displayNumber: parseInt(room.room_number, 10),
          type: type ? type.name : 'Room',
          baseRent: type ? type.base_rent : 2500,
          maxCapacity: type ? type.max_capacity : 1,
        };
      })
      .sort((a, b) => a.displayNumber - b.displayNumber);
  } catch (error) {
    console.error('Error fetching vacant rooms:', error);
    throw new Error(error.message || 'Failed to load available rooms. Please try again.');
  }
}

/**
 * 27. Get all pending tenant registrations awaiting landlord approval
 */
export async function getPendingTenantRegistrations() {
  try {
    if (isSupabaseConfigured && !supabase) {
      throw new Error('Supabase is required to review initial room and payment submissions.');
    }
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    let roomRequests = !isSupabaseConfigured ? (store[COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS] || []) : [];
    if (supabase) {
      const { data, error } = await supabase.from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
        .select('*').eq('status', 'pending');
      if (error) throw error;
      roomRequests = await Promise.all((data || []).map(async (request) => ({
        ...request,
        payment_proof_url: request.payment_proof_path
          ? await getInitialPaymentProofUrl(request.payment_proof_path)
          : '',
      })));
    }
    const rooms = store[COLLECTIONS.ROOMS] || [];
    
    return tenants
      .filter((tenant) => tenant.account_status === 'pending')
      .map((tenant) => {
        const roomRequest = roomRequests.find((request) => request.tenant_id === tenant.id && request.status === 'pending');
        const preferredRoom = rooms.find((room) => room.id === roomRequest?.requested_room_id);
        return {
          id: tenant.id,
          tenantId: tenant.id,
          name: `${tenant.first_name} ${tenant.last_name}`,
          firstName: tenant.first_name,
          lastName: tenant.last_name,
          email: tenant.email || 'No email',
          phone: tenant.phone,
          initials: tenant.initials,
          color: tenant.avatar_color,
          registeredAt: tenant.registered_at,
          roomSetupUpdatedAt: roomRequest?.updated_at || roomRequest?.requested_at || null,
          preferredRoomId: preferredRoom?.id || null,
          preferredRoomNumber: preferredRoom?.room_number || null,
          initialPaymentAmount: roomRequest?.initial_payment_amount || null,
          paymentDate: roomRequest?.payment_date || null,
          paymentReference: roomRequest?.payment_reference || '',
          paymentProofPath: roomRequest?.payment_proof_path || '',
          paymentProofUrl: roomRequest?.payment_proof_url || '',
          paymentProofStatus: roomRequest?.payment_proof_status || '',
        };
      })
      .sort((a, b) => {
        const aSetupTime = Date.parse(a.roomSetupUpdatedAt);
        const bSetupTime = Date.parse(b.roomSetupUpdatedAt);
        const aHasSetup = Number.isFinite(aSetupTime);
        const bHasSetup = Number.isFinite(bSetupTime);
        if (aHasSetup && bHasSetup) return aSetupTime - bSetupTime;
        if (aHasSetup) return -1;
        if (bHasSetup) return 1;
        return (Date.parse(a.registeredAt) || 0) - (Date.parse(b.registeredAt) || 0);
      });
  } catch (error) {
    console.error('Error fetching pending tenants:', error);
    throw new Error(error.message || 'Failed to load pending approvals. Please try again.');
  }
}

/** Return the live count of tenant accounts awaiting approval without loading payment proofs. */
export async function getPendingTenantRegistrationCount() {
  const tenants = isSupabaseConfigured && supabase
    ? await readCollection(COLLECTIONS.TENANTS)
    : (await getStore())[COLLECTIONS.TENANTS] || [];
  return tenants.filter((tenant) => tenant.account_status === 'pending').length;
}

/** Return the live count of tenant payment receipts waiting for staff review. */
export async function getPendingPaymentProofCount() {
  if (!isSupabaseConfigured || !supabase) {
    return getPendingPaymentProofs().then((proofs) => proofs.length);
  }

  const [pendingProofs, approvedProofs] = await Promise.all([
    readWhere(COLLECTIONS.PAYMENT_PROOFS, 'status', 'pending'),
    readWhere(COLLECTIONS.PAYMENT_PROOFS, 'status', 'approved'),
  ]);
  const invoiceIds = [...new Set(approvedProofs.map((proof) => proof.invoice_id).filter(Boolean))];
  const paymentsByInvoice = await Promise.all(invoiceIds.map((invoiceId) => readWhere(COLLECTIONS.PAYMENTS, 'invoice_id', invoiceId)));
  const payments = paymentsByInvoice.flat();
  const recoverableCount = approvedProofs.filter((proof) => {
    const reference = String(proof.reference_no || '').trim() || `PROOF-${proof.id}`;
    return !payments.some((payment) => payment.invoice_id === proof.invoice_id && payment.reference_no === reference);
  }).length;

  return pendingProofs.length + recoverableCount;
}

/**
 * 28. Approve tenant and create lease with initial invoice (Transaction)
 * Creates:
 * - Updates tenant status to 'approved'
 * - Creates a new lease with no security deposit
 * - Creates an initial invoice for one month advance
 * - Updates room status to 'occupied'
 * - Creates approval notification
 */
export async function approveTenant({
  tenantId,
  roomId,
  monthlyRent,
  dueDay,
  dueDate: requestedDueDate,
  approvedBy,
  initialPaymentAmount,
  initialPaymentDate,
  initialPaymentReference = '',
}) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    
    // Validation
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.account_status !== 'pending') throw new Error('Tenant is not pending approval');
    
    const room = rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    if (room.status !== 'vacant') throw new Error('Room is not available');
    
    const existingLease = leases.find((l) => l.tenant_id === tenantId && l.status === 'active');
    if (existingLease) throw new Error('Tenant already has an active lease');
    
    const rent = parseFloat(monthlyRent);
    if (isNaN(rent) || rent <= 0) throw new Error('Invalid monthly rent amount');

    const verifiedInitialPayment = Number(initialPaymentAmount) || 0;
    if (verifiedInitialPayment < 0) throw new Error('Initial payment cannot be negative');
    if (verifiedInitialPayment > rent) {
      throw new Error('The verified initial payment is greater than the assigned room rent. Correct the rent before approving.');
    }
    let initialPaymentDateStr = '';
    let initialPaymentDateObj = null;
    if (verifiedInitialPayment > 0) {
      const paymentDate = /^\d{4}-\d{2}-\d{2}$/.test(String(initialPaymentDate || ''))
        ? new Date(`${initialPaymentDate}T00:00:00`)
        : new Date(initialPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const paymentDay = new Date(paymentDate);
      paymentDay.setHours(0, 0, 0, 0);
      if (!initialPaymentDate || Number.isNaN(paymentDate.getTime()) || paymentDay > today) {
        throw new Error('The submitted initial payment has an invalid or future payment date.');
      }
      initialPaymentDateObj = paymentDay;
      initialPaymentDateStr = paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    const dueDayNum = parseInt(dueDay, 10);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) throw new Error('Due day must be between 1 and 31');
    
    const now = new Date();
    const approvedAtStr = now.toISOString();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const startDate = now.toISOString().split('T')[0];
    
    // Start the next billing cycle 30 days after the advance is paid in full.
    const advancePaidInFull = verifiedInitialPayment >= rent && initialPaymentDateObj;
    const dueDate = advancePaidInFull
      ? addDaysToDate(initialPaymentDateObj, 30)
      : requestedDueDate ? new Date(`${requestedDueDate}T00:00:00`) : new Date(now);
    if (!advancePaidInFull && !requestedDueDate) {
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(dueDayNum);
    }
    if (Number.isNaN(dueDate.getTime())) throw new Error('Choose a valid due date');
    const effectiveDueDay = dueDate.getDate();
    const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const leaseId = `lease-${Date.now()}`;
    const invoiceId = `invoice-${Date.now()}`;
    const initialPaymentId = `payment-initial-${Date.now()}`;
    const notificationId = `notif-${Date.now()}`;
    
    // Create records
    const updatedTenant = {
      ...tenant,
      account_status: 'approved',
      approved_at: approvedAtStr,
      approved_by: approvedBy || await getCurrentUserId(),
    };
    
    const newLease = {
      id: leaseId,
      tenant_id: tenantId,
      room_id: roomId,
      start_date: startDate,
      end_date: null,
      agreed_monthly_rent: rent,
      due_day_of_month: effectiveDueDay,
      security_deposit_amount: 0,
      security_deposit_paid: false,
      status: 'active',
    };
    
    const newInvoice = {
      id: invoiceId,
      lease_id: leaseId,
      billing_period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      invoice_type: 'initial',
      rent_charge: rent,
      utility_charge: 0,
      water_charge: 0,
      security_deposit: 0,
      other_charges: WIFI_CHARGE.amount,
      additional_charges: [WIFI_CHARGE],
      total_amount: rent + WIFI_CHARGE.amount,
      due_date: dueDateStr,
      status: verifiedInitialPayment >= rent + WIFI_CHARGE.amount ? 'paid' : verifiedInitialPayment > 0 ? 'partial' : 'unpaid',
      created_at: approvedAtStr,
      notes: 'Initial payment: 1 month advance',
    };

    const initialPayment = verifiedInitialPayment > 0 ? {
      id: initialPaymentId,
      invoice_id: invoiceId,
      amount_paid: verifiedInitialPayment,
      payment_date: initialPaymentDateStr,
      payment_method: 'cash',
      reference_no: String(initialPaymentReference || '').trim() || `INITIAL-${tenantId}`,
      received_by_user_id: approvedBy || await getCurrentUserId(),
      notes: 'Initial advance payment verified with tenant application proof.',
    } : null;
    
    const notification = {
      id: notificationId,
      tenant_id: tenantId,
      type: 'approval',
      title: 'Welcome! Your application was approved',
      message: advancePaidInFull
        ? `Your account has been approved and you've been assigned to Room ${room.room_number}. Your 1 month advance has been received. Your next billing is due on ${dueDateStr}.`
        : `Your account has been approved. You've been assigned to Room ${room.room_number}. Your initial payment of ₱${rent.toLocaleString()} (1 month advance) is due on ${dueDateStr}.`,
      read: false,
      dismissed: false,
      created_at: approvedAtStr,
      related_invoice_id: invoiceId,
    };
    
    // Persist to database
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('approve_tenant_application', {
        p_tenant_id: tenantId,
        p_room_id: roomId,
        p_lease: newLease,
        p_invoice: newInvoice,
        p_payment: initialPayment,
        p_notification: notification,
        p_approved_at: approvedAtStr,
        p_approved_by: updatedTenant.approved_by,
      });
      if (error) throw error;
    } else {
      // Mock database
      const mockStore = getNormalizedMockDatabase();
      const mockTenant = (mockStore[COLLECTIONS.TENANTS] || []).find((t) => t.id === tenantId);
      if (mockTenant) {
        mockTenant.account_status = 'approved';
        mockTenant.approved_at = approvedAtStr;
        mockTenant.approved_by = updatedTenant.approved_by;
      }
      
      mockStore[COLLECTIONS.LEASES].push(newLease);
      mockStore[COLLECTIONS.INVOICES].push(newInvoice);
      if (initialPayment) mockStore[COLLECTIONS.PAYMENTS].push(initialPayment);

      const mockRoom = (mockStore[COLLECTIONS.ROOMS] || []).find((r) => r.id === roomId);
      if (mockRoom) mockRoom.status = 'occupied';
      
      if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) {
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
      }
      mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
    }

    if (supabase) {
      const { error: assignmentSyncError } = await supabase.from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
        .update({ status: 'approved', assigned_room_id: roomId, payment_proof_status: 'approved', reviewed_at: approvedAtStr })
        .eq('tenant_id', tenantId).eq('status', 'pending');
      if (assignmentSyncError) console.warn('Could not update the Supabase room request after approval:', assignmentSyncError.message);
    }
    
    return {
      success: true,
      tenant: updatedTenant,
      lease: newLease,
      invoice: newInvoice,
      message: `${tenant.first_name} ${tenant.last_name} has been approved and assigned to Room ${room.room_number}.`,
    };
  } catch (error) {
    console.error('Error approving tenant:', error);
    throw new Error(error.message || 'Failed to approve tenant. Please try again.');
  }
}

/**
 * 29. Reject tenant application
 */
export async function rejectTenant({ tenantId, rejectionReason, rejectedBy }) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.account_status !== 'pending') throw new Error('Tenant is not pending approval');
    
    const now = new Date();
    const rejectedAtStr = now.toISOString();
    const reason = (rejectionReason || 'No available rooms at this time').trim();
    
    const notificationId = `notif-${Date.now()}`;
    const notification = {
      id: notificationId,
      tenant_id: tenantId,
      type: 'rejection',
      title: 'Application Update',
      message: `Your application could not be approved at this time. Reason: ${reason}. Please contact the property manager for more information.`,
      read: false,
      dismissed: false,
      created_at: rejectedAtStr,
      related_invoice_id: null,
    };
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('reject_tenant_application', {
        p_tenant_id: tenantId,
        p_rejected_at: rejectedAtStr,
        p_rejection_reason: reason,
        p_notification: notification,
      });
      if (error) throw error;
    } else {
      const mockStore = getNormalizedMockDatabase();
      const mockTenant = (mockStore[COLLECTIONS.TENANTS] || []).find((t) => t.id === tenantId);
      if (mockTenant) {
        mockTenant.account_status = 'rejected';
        mockTenant.rejected_at = rejectedAtStr;
        mockTenant.rejection_reason = reason;
      }

      if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) {
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
      }
      mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
    }

    if (supabase) {
      const { error: assignmentSyncError } = await supabase.from(COLLECTIONS.ROOM_ASSIGNMENT_REQUESTS)
        .update({ status: 'rejected', payment_proof_status: 'rejected', reviewed_at: rejectedAtStr, rejection_reason: reason })
        .eq('tenant_id', tenantId).eq('status', 'pending');
      if (assignmentSyncError) console.warn('Could not update the Supabase room request after rejection:', assignmentSyncError.message);
    }
    
    return {
      success: true,
      message: `${tenant.first_name} ${tenant.last_name}'s application has been rejected.`,
    };
  } catch (error) {
    console.error('Error rejecting tenant:', error);
    throw new Error(error.message || 'Failed to reject tenant. Please try again.');
  }
}

/**
 * 30. Get tenant financial summary
 */
export async function getTenantFinancialSummary(tenantId) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    const roomTypes = store[COLLECTIONS.ROOM_TYPES] || [];
    
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    
    const activeLease = leases.find((l) => l.tenant_id === tenantId && l.status === 'active');
    if (!activeLease) {
      return {
        tenantId,
        name: `${tenant.first_name} ${tenant.last_name}`,
        accountStatus: tenant.account_status,
        hasLease: false,
        totalCollected: 0,
        outstandingBalance: 0,
        securityDeposit: 0,
        leaseStart: null,
        roomNumber: null,
        roomType: null,
      };
    }
    
    const room = rooms.find((r) => r.id === activeLease.room_id);
    const roomType = room ? roomTypes.find((rt) => rt.id === room.type_id) : null;
    
    const tenantInvoices = invoices.filter((inv) => inv.lease_id === activeLease.id);
    const tenantPayments = payments.filter((p) => 
      tenantInvoices.some((inv) => inv.id === p.invoice_id)
    );

    const totalCollected = tenantPayments.reduce((sum, p) => toMoney(sum + (Number(p.amount_paid) || 0)), 0);
    const outstandingBalance = tenantInvoices.reduce((sum, inv) => {
      const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
      const paidAmount = invPayments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
      return toMoney(sum + Math.max(0, toMoney(getInvoiceTotalAmount(inv) - paidAmount)));
    }, 0);
    
    return {
      tenantId,
      name: `${tenant.first_name} ${tenant.last_name}`,
      accountStatus: tenant.account_status,
      hasLease: true,
      totalCollected,
      outstandingBalance,
      leaseStart: activeLease.start_date,
      roomNumber: room ? parseInt(room.room_number, 10) : null,
      roomType: roomType ? roomType.name : null,
      monthlyRent: activeLease.agreed_monthly_rent,
    };
  } catch (error) {
    console.error('Error fetching tenant financial summary:', error);
    throw error;
  }
}

/** Return the oldest unpaid invoice for a tenant's active lease. */
export async function getNextUnpaidInvoiceForTenant(tenantId) {
  const store = await getStore();
  const activeLease = (store[COLLECTIONS.LEASES] || []).find(
    (lease) => lease.tenant_id === tenantId && lease.status === 'active'
  );
  if (!activeLease) return null;

  const invoices = (store[COLLECTIONS.INVOICES] || [])
    .filter((invoice) => invoice.lease_id === activeLease.id)
    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
  const payments = store[COLLECTIONS.PAYMENTS] || [];

  for (const invoice of invoices) {
    const paid = payments
      .filter((payment) => payment.invoice_id === invoice.id)
      .reduce((sum, payment) => toMoney(sum + (Number(payment.amount_paid) || 0)), 0);
    const balance = Math.max(0, toMoney(getInvoiceTotalAmount(invoice) - paid));
    if (balance > 0) return { id: invoice.id, balance };
  }

  return null;
}

/**
 * 31. Calculate tenant balance
 */
export async function calculateTenantBalance(tenantId) {
  try {
    const summary = await getTenantFinancialSummary(tenantId);
    return summary.outstandingBalance || 0;
  } catch (error) {
    console.error('Error calculating tenant balance:', error);
    return 0;
  }
}

/**
 * 32. Get all tenants with financial status (for landlord management)
 * Supports filtering: 'all', 'paid', 'unpaid', 'overdue'
 */
export async function getTenantsWithFinancialStatus(filter = 'all') {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    const paymentProofs = store[COLLECTIONS.PAYMENT_PROOFS] || [];
    
    const now = new Date();
    
    const tenantsWithFinances = await Promise.all(
      tenants
        .filter((t) => t.account_status === 'approved')
        .map(async (tenant) => {
          const activeLease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
          if (!activeLease) return null;
          
          const room = rooms.find((r) => r.id === activeLease.room_id);
          const tenantInvoices = invoices.filter((inv) => inv.lease_id === activeLease.id);
          const tenantPayments = payments.filter((p) => 
            tenantInvoices.some((inv) => inv.id === p.invoice_id)
          );
          const tenantInvoiceIds = new Set(tenantInvoices.map((invoice) => invoice.id));
          const verifiedProofs = paymentProofs.filter((proof) =>
            proof.status === 'approved' && tenantInvoiceIds.has(proof.invoice_id)
          );
          
          const balance = tenantInvoices.reduce((sum, inv) => {
            const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
            const paidAmount = invPayments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
            return toMoney(sum + Math.max(0, toMoney(getInvoiceTotalAmount(inv) - paidAmount)));
          }, 0);
          
          // Find latest unpaid invoice to check if overdue
          const unpaidInvoices = tenantInvoices.filter((inv) => {
            const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
            const paidAmount = invPayments.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
            return toMoney(getInvoiceTotalAmount(inv) - paidAmount) > 0;
          });
          
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let isOverdue = false;
          if (unpaidInvoices.length > 0) {
            isOverdue = unpaidInvoices.some((inv) => {
              const [year, month, day] = String(inv.due_date || '').slice(0, 10).split('-').map(Number);
              if (!year || !month || !day) return false;
              const dueDate = new Date(year, month - 1, day);
              return dueDate < todayStart;
            });
          }
          
          const lastPayment = [
            ...tenantPayments.map((payment) => getPaymentDateTimestamp(payment)),
            ...verifiedProofs.map((proof) => getPaymentDateTimestamp(proof)),
          ]
            .filter((timestamp) => timestamp !== null)
            .sort((a, b) => b - a)[0] ?? null;
          
          return {
            id: tenant.id.replace('tenant-', ''),
            tenantId: tenant.id,
            name: `${tenant.first_name} ${tenant.last_name}`,
            initials: tenant.initials,
            color: tenant.avatar_color,
            roomNumber: room ? parseInt(room.room_number, 10) : null,
            monthlyRent: activeLease.agreed_monthly_rent,
            balance,
            lastPayment: lastPayment === null ? null : new Date(lastPayment).toISOString(),
            isOverdue,
            status: balance === 0 ? 'paid' : (isOverdue ? 'overdue' : 'unpaid'),
          };
        })
    );
    
    let filteredTenants = tenantsWithFinances.filter((t) => t !== null);
    
    // Apply filter
    if (filter === 'paid') {
      filteredTenants = filteredTenants.filter((t) => t.balance === 0);
    } else if (filter === 'unpaid') {
      filteredTenants = filteredTenants.filter((t) => t.balance > 0);
    } else if (filter === 'overdue') {
      filteredTenants = filteredTenants.filter((t) => t.isOverdue);
    }
    
    return filteredTenants;
  } catch (error) {
    console.error('Error fetching tenants with financial status:', error);
    throw error;
  }
}

/**
 * 33. Get tenant payment history
 */
export async function getTenantPaymentHistory(tenantId) {
  try {
    const store = await getStore();
    const leases = store[COLLECTIONS.LEASES] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    
    const activeLease = leases.find((l) => l.tenant_id === tenantId && l.status === 'active');
    if (!activeLease) return [];
    
    const tenantInvoices = invoices.filter((inv) => inv.lease_id === activeLease.id);
    const tenantPayments = payments.filter((p) => 
      tenantInvoices.some((inv) => inv.id === p.invoice_id)
    );
    
    return tenantPayments
      .map((payment) => {
        const invoice = tenantInvoices.find((inv) => inv.id === payment.invoice_id);
        const paymentTimestamp = getPaymentDateTimestamp(payment);
        return {
          id: payment.id,
          amount: payment.amount_paid,
          date: paymentTimestamp === null
            ? payment.payment_date
            : new Date(paymentTimestamp).toISOString(),
          method: payment.payment_method,
          referenceNo: payment.reference_no,
          invoiceId: payment.invoice_id,
          billingPeriod: invoice ? invoice.billing_period : null,
        };
      })
      .sort((a, b) => (getDateTimestamp(b.date) ?? 0) - (getDateTimestamp(a.date) ?? 0));
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return [];
  }
}

/**
 * 34. Get invoice details with payments
 */
export async function getInvoiceWithPayments(invoiceId) {
  try {
    const store = await getStore();
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const invoicePayments = payments.filter((p) => p.invoice_id === invoiceId);
    const totalPaid = invoicePayments.reduce((sum, p) => toMoney(sum + (Number(p.amount_paid) || 0)), 0);
    const balance = Math.max(0, toMoney(getInvoiceTotalAmount(invoice) - totalPaid));
    
    const lease = leases.find((l) => l.id === invoice.lease_id);
    const tenant = lease ? tenants.find((t) => t.id === lease.tenant_id) : null;
    const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
    
    return {
      ...invoice,
      security_deposit: 0,
      total_amount: getInvoiceTotalAmount(invoice),
      tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : null,
      roomNumber: room ? parseInt(room.room_number, 10) : null,
      payments: invoicePayments.map((p) => ({
        id: p.id,
        amount: p.amount_paid,
        date: p.payment_date,
        method: p.payment_method,
        referenceNo: p.reference_no,
      })),
      totalPaid,
      balance,
    };
  } catch (error) {
    console.error('Error fetching invoice with payments:', error);
    throw error;
  }
}

/**
 * 35. Record payment against an invoice
 */
export async function recordPayment({ invoiceId, amountPaid, paymentDate, paymentMethod, referenceNo = '', receivedBy, notes = '' }) {
  try {
    const store = await getStore();
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];

    const invoice = invoices.find((item) => item.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const amount = Number(amountPaid);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
      throw new Error('Payment amount must be a valid amount greater than zero with no more than two decimal places');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(paymentDate || ''))) {
      throw new Error('Enter a valid payment date in YYYY-MM-DD format');
    }
    const [year, month, day] = paymentDate.split('-').map(Number);
    const payDate = new Date(year, month - 1, day);
    if (payDate.getFullYear() !== year || payDate.getMonth() !== month - 1 || payDate.getDate() !== day) {
      throw new Error('Invalid payment date');
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (payDate > today) throw new Error('Payment date cannot be in the future');
    if (paymentMethod !== 'cash') throw new Error('Only in-person cash payments are accepted');

    const alreadyPaid = payments
      .filter((payment) => payment.invoice_id === invoiceId)
      .reduce((sum, payment) => toMoney(sum + (Number(payment.amount_paid) || 0)), 0);
    const invoiceTotal = getInvoiceTotalAmount(invoice);
    const balanceBeforePayment = Math.max(0, toMoney(invoiceTotal - alreadyPaid));
    const normalizedAmount = toMoney(amount);
    if (normalizedAmount > balanceBeforePayment) {
      throw new Error(`Payment cannot exceed this invoice's remaining balance of ${balanceBeforePayment.toLocaleString()}`);
    }

    const newBalance = Math.max(0, toMoney(balanceBeforePayment - normalizedAmount));
    const newStatus = newBalance === 0 ? 'paid' : 'partial';
    const paymentId = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const stableReference = String(referenceNo || '').trim();
    const newPayment = {
      id: paymentId,
      invoice_id: invoiceId,
      amount_paid: normalizedAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_no: stableReference || `${paymentMethod.toUpperCase()}-${paymentId.slice(-6).toUpperCase()}`,
      received_by_user_id: receivedBy || await getCurrentUserId(),
      notes: String(notes || '').trim(),
    };

    const lease = leases.find((item) => item.id === invoice.lease_id);
    const notification = lease ? {
      id: `notif-${paymentId}`,
      tenant_id: lease.tenant_id,
      type: 'payment_recorded',
      title: 'Payment Received',
      message: `Your payment of PHP ${amount.toLocaleString()} has been recorded. Receipt: ${newPayment.reference_no}. Remaining balance: PHP ${newBalance.toLocaleString()}.`,
      read: false,
      dismissed: false,
      created_at: new Date().toISOString(),
      related_invoice_id: invoiceId,
    } : null;

    const nextBillingDate = lease && invoice.invoice_type === 'initial' && newBalance === 0
      ? addDaysToDate(payDate, 30)
      : null;
    const nextBillingDueDay = nextBillingDate?.getDate();
    const nextBillingDueDateStr = nextBillingDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (isSupabaseConfigured && supabase) {
      const nextInvoice = {
        ...invoice,
        status: newStatus,
        total_amount: invoiceTotal,
        security_deposit: 0,
        ...(nextBillingDueDateStr ? { due_date: nextBillingDueDateStr } : {}),
      };
      const { error } = await supabase.rpc('record_tenant_payment', {
        p_payment: newPayment,
        p_invoice: nextInvoice,
        p_lease_id: lease?.id || null,
        p_due_day: nextBillingDueDay || null,
        p_notification: notification,
      });
      if (error) throw error;
    } else {
      const mockStore = getNormalizedMockDatabase();
      mockStore[COLLECTIONS.PAYMENTS].push(newPayment);
      const mockInvoice = (mockStore[COLLECTIONS.INVOICES] || []).find((item) => item.id === invoiceId);
      if (mockInvoice) {
        mockInvoice.status = newStatus;
        mockInvoice.total_amount = invoiceTotal;
        mockInvoice.security_deposit = 0;
        if (nextBillingDueDateStr) mockInvoice.due_date = nextBillingDueDateStr;
      }
      const mockLease = nextBillingDueDay ? (mockStore[COLLECTIONS.LEASES] || []).find((item) => item.id === lease.id) : null;
      if (mockLease) mockLease.due_day_of_month = nextBillingDueDay;
      if (notification) {
        if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
      }
    }

    return {
      success: true,
      payment: newPayment,
      newInvoiceStatus: newStatus,
      remainingBalance: newBalance,
      message: `Payment of PHP ${amount.toLocaleString()} recorded successfully.`,
    };
  } catch (error) {
    console.error('Error recording payment:', error);
    throw new Error(error.message || 'Failed to record payment. Please try again.');
  }
}

/**
 * 36. Get tenant notifications
 */
export async function getTenantNotifications(tenantId) {
  try {
    const store = await getStore();
    const notifications = store[COLLECTIONS.TENANT_NOTIFICATIONS] || [];
    
    return notifications
      .filter((notif) => notif.tenant_id === tenantId && !notif.dismissed)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Error fetching tenant notifications:', error);
    return [];
  }
}

/** Dismiss a tenant's notification without deleting its record. */
export async function dismissTenantNotification(notificationId) {
  try {
    if (isSupabaseConfigured && supabase) {
      await updateDocument(COLLECTIONS.TENANT_NOTIFICATIONS, notificationId, { dismissed: true });
    } else {
      const mockStore = getNormalizedMockDatabase();
      const notification = (mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] || []).find((item) => item.id === notificationId);
      if (notification) notification.dismissed = true;
    }
    return { success: true };
  } catch (error) {
    console.error('Error dismissing tenant notification:', error);
    throw error;
  }
}

/**
 * 37. Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    if (isSupabaseConfigured && supabase) {
      await updateDocument(COLLECTIONS.TENANT_NOTIFICATIONS, notificationId, { read: true });
    } else {
      const mockStore = getNormalizedMockDatabase();
      const notification = (mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] || []).find((n) => n.id === notificationId);
      if (notification) notification.read = true;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * 38. Create notification (helper function)
 */
export async function createNotification({ tenantId, type, title, message, relatedInvoiceId = null }) {
  try {
    const notificationId = `notif-${Date.now()}`;
    const notification = {
      id: notificationId,
      tenant_id: tenantId,
      type,
      title,
      message,
      read: false,
      created_at: new Date().toISOString(),
      related_invoice_id: relatedInvoiceId,
    };
    
    if (isSupabaseConfigured && supabase) {
      await writeDocument(COLLECTIONS.TENANT_NOTIFICATIONS, notificationId, notification);
    } else {
      const mockStore = getNormalizedMockDatabase();
      if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) {
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
      }
      mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
    }
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * 40. Submit payment proof (tenant submits payment with image)
 */
export async function submitPaymentProof({ tenantId, invoiceId, amount, paymentDate, paymentMethod, referenceNo, proofImageUrl, notes }) {
  try {
    if (paymentMethod !== 'cash') {
      throw new Error('Only in-person cash payments can be submitted');
    }
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');

    const activeLease = (store[COLLECTIONS.LEASES] || []).find(
      (lease) => lease.tenant_id === tenantId && lease.status === 'active'
    );
    if (!activeLease || invoice.lease_id !== activeLease.id) throw new Error('This invoice is not assigned to your active lease.');
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) throw new Error('Enter a valid payment amount.');
    if (!paymentDate || Number.isNaN(new Date(`${paymentDate}T00:00:00`).getTime())) throw new Error('Enter a valid payment date.');
    if (!proofImageUrl) throw new Error('Upload a photo of your receipt.');
    const outstanding = getInvoiceBalance(invoice.id, store);
    if (paymentAmount > outstanding) throw new Error(`The payment cannot exceed the invoice balance of PHP ${outstanding.toLocaleString()}.`);
    if ((store[COLLECTIONS.PAYMENT_PROOFS] || []).some((proof) => proof.invoice_id === invoiceId && proof.status === 'pending')) {
      throw new Error('A payment proof for this invoice is already awaiting review.');
    }
    
    const proofId = `proof-${Date.now()}`;
    const now = new Date().toISOString();
    
    const paymentProof = {
      id: proofId,
      tenant_id: tenantId,
      invoice_id: invoiceId,
      amount: paymentAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_no: referenceNo || '',
      proof_image_url: proofImageUrl || '',
      notes: notes || '',
      status: 'pending',
      submitted_at: now,
      reviewed_at: null,
      reviewed_by_user_id: null,
      rejection_reason: null,
    };
    
    if (isSupabaseConfigured && supabase) {
      await writeDocument(COLLECTIONS.PAYMENT_PROOFS, proofId, paymentProof);
    } else {
      const mockStore = getNormalizedMockDatabase();
      if (!mockStore[COLLECTIONS.PAYMENT_PROOFS]) {
        mockStore[COLLECTIONS.PAYMENT_PROOFS] = [];
      }
      mockStore[COLLECTIONS.PAYMENT_PROOFS].push(paymentProof);
    }
    
    return paymentProof;
  } catch (error) {
    console.error('Error submitting payment proof:', error);
    throw new Error(error.message || 'Failed to submit payment proof');
  }
}

/**
 * 41. Get pending payment proofs for landlord review
 */
export async function getPendingPaymentProofs() {
  try {
    const store = await getStore();
    const proofs = store[COLLECTIONS.PAYMENT_PROOFS] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    
    return (await Promise.all(proofs
      .filter((proof) => {
        if (proof.status === 'pending') return true;
        if (proof.status !== 'approved') return false;
        const stableReference = String(proof.reference_no || '').trim() || `PROOF-${proof.id}`;
        return !payments.some((payment) => payment.invoice_id === proof.invoice_id && payment.reference_no === stableReference);
      })
      .map(async (proof) => {
        const tenant = tenants.find((t) => t.id === proof.tenant_id);
        const invoice = invoices.find((inv) => inv.id === proof.invoice_id);
        const lease = invoice ? leases.find((l) => l.id === invoice.lease_id) : null;
        const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
        
        return {
          id: proof.id,
          needsRecording: proof.status === 'approved',
          tenantId: proof.tenant_id,
          tenantName: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Unknown',
          tenantInitials: tenant?.initials || 'T',
          tenantColor: tenant?.avatar_color || '#8b5cf6',
          roomNumber: room ? room.room_number.replace(/^0/, '') : '-',
          invoiceId: proof.invoice_id,
          invoicePeriod: invoice?.billing_period || '-',
          amount: proof.amount,
          paymentDate: proof.payment_date,
          paymentMethod: proof.payment_method,
          referenceNo: proof.reference_no,
          proofImagePath: proof.proof_image_url,
          proofImageUrl: await getPaymentProofUrl(proof.proof_image_url),
          notes: proof.notes,
          submittedAt: proof.submitted_at,
        };
      })))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch (error) {
    console.error('Error fetching pending payment proofs:', error);
    return [];
  }
}

/**
 * 42. Get tenant's payment proof submissions
 */
export async function getTenantPaymentProofs(tenantId) {
  try {
    const store = await getStore();
    const proofs = store[COLLECTIONS.PAYMENT_PROOFS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    
    return (await Promise.all(proofs
      .filter((proof) => proof.tenant_id === tenantId)
      .map(async (proof) => {
        const invoice = invoices.find((inv) => inv.id === proof.invoice_id);
        
        return {
          id: proof.id,
          invoiceId: proof.invoice_id,
          invoicePeriod: invoice?.billing_period || '-',
          amount: proof.amount,
          paymentDate: proof.payment_date,
          paymentMethod: proof.payment_method,
          referenceNo: proof.reference_no,
          proofImagePath: proof.proof_image_url,
          proofImageUrl: await getPaymentProofUrl(proof.proof_image_url),
          notes: proof.notes,
          status: proof.status,
          submittedAt: proof.submitted_at,
          reviewedAt: proof.reviewed_at,
          rejectionReason: proof.rejection_reason,
        };
      })))
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } catch (error) {
    console.error('Error fetching tenant payment proofs:', error);
    return [];
  }
}

/**
 * 43. Approve payment proof and record payment
 */
export async function approvePaymentProof(proofId, reviewerUserId) {
  try {
    const store = await getStore();
    const proofs = store[COLLECTIONS.PAYMENT_PROOFS] || [];
    
    const proof = proofs.find((p) => p.id === proofId);
    if (!proof) throw new Error('Payment proof not found');
    if (proof.status !== 'pending' && proof.status !== 'approved') throw new Error('Payment proof has already been reviewed');
    
    const now = new Date().toISOString();
    const stableReference = String(proof.reference_no || '').trim() || `PROOF-${proof.id}`;
    const paymentAlreadyRecorded = (store[COLLECTIONS.PAYMENTS] || []).some(
      (payment) => payment.invoice_id === proof.invoice_id && payment.reference_no === stableReference
    );

    // Record first so an invalid payment never leaves the proof marked approved.
    // The stable reference also makes retries safe if the status update fails.
    if (!paymentAlreadyRecorded) {
      await recordPayment({
        invoiceId: proof.invoice_id,
        amountPaid: proof.amount,
        paymentDate: proof.payment_date,
        paymentMethod: proof.payment_method,
        referenceNo: stableReference,
        receivedBy: reviewerUserId,
      });
    }

    if (isSupabaseConfigured && supabase) {
      await updateDocument(COLLECTIONS.PAYMENT_PROOFS, proofId, {
        status: 'approved',
        reviewed_at: now,
        reviewed_by_user_id: reviewerUserId,
      });
    } else {
      proof.status = 'approved';
      proof.reviewed_at = now;
      proof.reviewed_by_user_id = reviewerUserId;
    }
    
    // Notify tenant
    await createNotification({
      tenantId: proof.tenant_id,
      type: 'payment_verified',
      title: 'Payment Verified',
      message: `Your payment of ₱${proof.amount.toLocaleString()} has been verified and recorded.`,
      relatedInvoiceId: proof.invoice_id,
    });
    
    return { success: true, message: 'Payment verified and recorded successfully' };
  } catch (error) {
    console.error('Error approving payment proof:', error);
    throw new Error(error.message || 'Failed to approve payment proof');
  }
}

/**
 * 44. Reject payment proof
 */
export async function rejectPaymentProof(proofId, reviewerUserId, reason) {
  try {
    const store = await getStore();
    const proofs = store[COLLECTIONS.PAYMENT_PROOFS] || [];
    
    const proof = proofs.find((p) => p.id === proofId);
    if (!proof) throw new Error('Payment proof not found');
    if (proof.status !== 'pending') throw new Error('Payment proof has already been reviewed');
    
    const now = new Date().toISOString();
    
    if (isSupabaseConfigured && supabase) {
      await updateDocument(COLLECTIONS.PAYMENT_PROOFS, proofId, {
        status: 'rejected',
        reviewed_at: now,
        reviewed_by_user_id: reviewerUserId,
        rejection_reason: reason,
      });
    } else {
      proof.status = 'rejected';
      proof.reviewed_at = now;
      proof.reviewed_by_user_id = reviewerUserId;
      proof.rejection_reason = reason;
    }
    
    // Notify tenant
    await createNotification({
      tenantId: proof.tenant_id,
      type: 'payment_rejected',
      title: 'Payment Proof Rejected',
      message: `Your payment proof was rejected. Reason: ${reason}`,
      relatedInvoiceId: proof.invoice_id,
    });
    
    return { success: true, message: 'Payment proof rejected' };
  } catch (error) {
    console.error('Error rejecting payment proof:', error);
    throw new Error(error.message || 'Failed to reject payment proof');
  }
}
