/**
 * 3NF Data Service Layer
 * 
 * Executes relational queries across the normalized Firestore collections. Staff
 * profiles are read by the authentication service; the remaining collections hold
 * property, tenancy, billing, issue, request, and announcement records.
 * 
 * Reads and writes directly to Firebase Firestore when configured.
 * Gracefully falls back to in-memory 3NF mock store in demo mode.
 */

import { auth, db, isFirebaseConfigured } from '../utils/firebase.js';
import { COLLECTIONS } from './databaseSchema.js';
import { getNormalizedMockDatabase, seedFirestoreDatabase } from './seedDatabase.js';

// ─── Firestore Helpers ───────────────────────────────────────

let firestoreImports = null;

async function getFirestoreFns() {
  if (!firestoreImports) {
    firestoreImports = await import('firebase/firestore');
  }
  return firestoreImports;
}

async function readCollection(collectionName) {
  try {
    const { collection, getDocs } = await getFirestoreFns();
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn(`Firestore read denied or failed for "${collectionName}":`, error.message || error);
    throw error;
  }
}

async function readWhere(collectionName, field, value) {
  const { collection, getDocs, query, where } = await getFirestoreFns();
  const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

async function writeDocument(collectionName, docId, data) {
  try {
    const { doc, setDoc } = await getFirestoreFns();
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, { id: docId, ...data });
    return { id: docId, ...data };
  } catch (error) {
    console.error(`Error writing to "${collectionName}/${docId}":`, error);
    throw error;
  }
}

async function updateDocument(collectionName, docId, updates) {
  try {
    const { doc, updateDoc } = await getFirestoreFns();
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error(`Error updating "${collectionName}/${docId}":`, error);
    throw error;
  }
}

// ─── Store Access (Firestore or In-Memory) ───────────────────

async function getStore() {
  if (!isFirebaseConfigured || !db) {
    return getNormalizedMockDatabase();
  }

  const collectionNames = Object.values(COLLECTIONS);
  const uid = auth?.currentUser?.uid;
  if (!uid) return Object.fromEntries(collectionNames.map((name) => [name, []]));

  const { doc, getDoc } = await getFirestoreFns();
  const userSnapshot = await getDoc(doc(db, COLLECTIONS.USERS, uid));
  const role = userSnapshot.exists() ? userSnapshot.data().role : null;

  if (role === 'owner' || role === 'caretaker') {
    const staffResults = await Promise.all(collectionNames.map(async (name) => {
      try {
        return [name, await readCollection(name)];
      } catch {
        return [name, []];
      }
    }));
    return Object.fromEntries(staffResults);
  }

  if (role !== 'tenant') return Object.fromEntries(collectionNames.map((name) => [name, []]));

  // Read only this tenant's documents and their related billing records.
  const tenantProfiles = await readWhere(COLLECTIONS.TENANTS, 'user_id', uid);
  const tenant = tenantProfiles[0];
  if (!tenant) return Object.fromEntries(collectionNames.map((name) => [name, []]));

  const tenantStore = Object.fromEntries(collectionNames.map((name) => [name, []]));
  const [boardingHouses, roomTypes, rooms, leases, complaints, announcements, roomChangeRequests, extensionRequests] = await Promise.all([
    readCollection(COLLECTIONS.BOARDING_HOUSES),
    readCollection(COLLECTIONS.ROOM_TYPES),
    readCollection(COLLECTIONS.ROOMS),
    readWhere(COLLECTIONS.LEASES, 'tenant_id', tenant.id),
    readWhere(COLLECTIONS.COMPLAINTS, 'tenant_id', tenant.id),
    readCollection(COLLECTIONS.ANNOUNCEMENTS),
    readWhere(COLLECTIONS.ROOM_CHANGE_REQUESTS, 'tenant_id', tenant.id),
    readWhere(COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS, 'tenant_id', tenant.id).catch(() => []),
  ]);
  const invoices = (await Promise.all(leases.map((lease) => readWhere(COLLECTIONS.INVOICES, 'lease_id', lease.id)))).flat();
  const payments = (await Promise.all(invoices.map((invoice) => readWhere(COLLECTIONS.PAYMENTS, 'invoice_id', invoice.id)))).flat();

  tenantStore[COLLECTIONS.USERS] = [{ id: uid, ...userSnapshot.data() }];
  tenantStore[COLLECTIONS.TENANTS] = tenantProfiles;
  tenantStore[COLLECTIONS.BOARDING_HOUSES] = boardingHouses;
  tenantStore[COLLECTIONS.ROOM_TYPES] = roomTypes;
  tenantStore[COLLECTIONS.ROOMS] = rooms;
  tenantStore[COLLECTIONS.LEASES] = leases;
  tenantStore[COLLECTIONS.INVOICES] = invoices;
  tenantStore[COLLECTIONS.PAYMENTS] = payments;
  tenantStore[COLLECTIONS.COMPLAINTS] = complaints;
  tenantStore[COLLECTIONS.ANNOUNCEMENTS] = announcements;
  tenantStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] = roomChangeRequests;
  tenantStore[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] = extensionRequests;
  return tenantStore;

}

// ─── Relational Join Helpers ─────────────────────────────────

function getInvoiceBalance(invoiceId, store) {
  try {
    const invoice = (store[COLLECTIONS.INVOICES] || []).find((inv) => inv.id === invoiceId);
    if (!invoice) return 0;

    const payments = (store[COLLECTIONS.PAYMENTS] || []).filter((p) => p.invoice_id === invoiceId);
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const balance = invoice.total_amount - totalPaid;
    return Math.max(0, balance);
  } catch (error) {
    console.error('Error computing invoice balance:', error);
    return 0;
  }
}

function getLatestInvoiceForLease(invoices, leaseId) {
  return invoices
    .filter((invoice) => invoice.lease_id === leaseId)
    .sort((a, b) => String(b.billing_period || b.due_date || '').localeCompare(String(a.billing_period || a.due_date || '')))[0] || null;
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
      balance = Math.max(0, currentInvoice.total_amount - totalPaid);
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
  if (!isFirebaseConfigured || !db) return getStore();

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
  const isLiveStore = isFirebaseConfigured && db;
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
  const store = isFirebaseConfigured && db ? null : await getStore();
  const roomTypes = isFirebaseConfigured && db
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

/** Add a vacant room. Room creation is restricted to owner accounts in Firestore rules. */
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

  const liveStore = isFirebaseConfigured && db;
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

  const formattedNumber = normalizedNumber.padStart(2, '0');
  if (rooms.some((room) => String(parseInt(room.room_number, 10)) === normalizedNumber)) {
    throw new Error('A room with that number already exists.');
  }

  const roomId = `room-${Date.now()}`;
  const newRoom = {
    id: roomId,
    house_id: boardingHouses[0]?.id || 'bh-1',
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
export async function getRevenue(month = 'september') {
  try {
    const store = await getStore();
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];

    const septInvoices = invoices.filter((inv) => inv.billing_period === '2026-09');
    const expected = septInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    const septPayments = payments.filter((p) => {
      const inv = invoices.find((i) => i.id === p.invoice_id);
      return inv && inv.billing_period === '2026-09';
    });

    const collected = septPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const outstanding = Math.max(0, expected - collected);
    const percentCollected = expected > 0 ? Math.round((collected / expected) * 100) : 0;

    const rentCollected = septInvoices.reduce((sum, inv) => sum + (inv.rent_charge || 0), 0);
    const electricityFees = septInvoices.reduce((sum, inv) => sum + (inv.utility_charge || 0), 0);

    return {
      expected: expected || 0,
      collected: collected || 0,
      outstanding: outstanding || 0,
      percentCollected: percentCollected || 0,
      rentCollected: rentCollected || 0,
      electricityFees: electricityFees || 0,
    };
  } catch (error) {
    console.error('Error computing revenue:', error);
    return { expected: 0, collected: 0, outstanding: 0, percentCollected: 0, rentCollected: 0, electricityFees: 0 };
  }
}

/**
 * 6. Historical Monthly Income
 */
export async function getMonthlyIncome() {
  try {
    const store = await getStore();
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const payments = store[COLLECTIONS.PAYMENTS] || [];

    const periods = [
      { month: 'May', period: '2026-05', defaultAmount: 0 },
      { month: 'Jun', period: '2026-06', defaultAmount: 0 },
      { month: 'Jul', period: '2026-07', defaultAmount: 0 },
      { month: 'Aug', period: '2026-08', defaultAmount: 0 },
      { month: 'Sep', period: '2026-09', defaultAmount: 0 },
    ];

    return periods.map(({ month, period, defaultAmount }) => {
      const periodInvoices = invoices.filter((inv) => inv.billing_period === period);
      if (periodInvoices.length === 0) {
        return { month, amount: defaultAmount };
      }
      const periodPayments = payments.filter((p) => {
        const inv = invoices.find((i) => i.id === p.invoice_id);
        return inv && inv.billing_period === period;
      });
      const amount = periodPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      return { month, amount: amount || defaultAmount };
    });
  } catch (error) {
    console.error('Error computing monthly income:', error);
    return [
      { month: 'May', amount: 0 },
      { month: 'Jun', amount: 0 },
      { month: 'Jul', amount: 0 },
      { month: 'Aug', amount: 0 },
      { month: 'Sep', amount: 0 },
    ];
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
 * 11. September Summary for Reports
 */
export async function getSeptemberSummary() {
  try {
    const revenue = await getRevenue('september');
    const occupancy = await getOccupancyStats();
    const issueStats = await getIssueStats();

    return {
      rentCollected: revenue.rentCollected,
      unpaidBalance: revenue.outstanding,
      electricityFees: revenue.electricityFees,
      occupiedRooms: occupancy.occupied,
      totalRooms: occupancy.totalRooms,
      newComplaints: issueStats.total,
      resolved: issueStats.resolved,
    };
  } catch (error) {
    console.error('Error computing September summary:', error);
    return { rentCollected: 0, unpaidBalance: 0, electricityFees: 0, occupiedRooms: 0, totalRooms: 0, newComplaints: 0, resolved: 0 };
  }
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
    const invoices = store[COLLECTIONS.INVOICES] || [];

    const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
    const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
    const invoice = lease ? getLatestInvoiceForLease(invoices, lease.id) : null;
    const balance = invoice ? getInvoiceBalance(invoice.id, store) : 0;

    return {
      id: String(tenant.id).replace('tenant-', ''),
      tenant_id: tenant.id,
      name: `${tenant.first_name} ${tenant.last_name}`,
      initials: tenant.initials,
      roomNumber: room ? parseInt(room.room_number, 10) : null,
      roomType: 'Single Occupancy',
      outstandingBalance: balance,
      dueDate: invoice ? invoice.due_date : 'Pending room assignment',
      color: tenant.avatar_color,
    };
  } catch (error) {
    console.warn('Could not fetch current tenant:', error.message || error);
    return null;
  }
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
    const invoice = lease ? getLatestInvoiceForLease(invoices, lease.id) : null;

    if (invoice) {
      const invPayments = payments.filter((p) => p.invoice_id === invoice.id);
      const paidAmount = invPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      const outstanding = Math.max(0, invoice.total_amount - paidAmount);
      const latestPayment = [...invPayments].sort((a, b) => String(b.payment_date || '').localeCompare(String(a.payment_date || '')))[0];

      return {
        month: invoice.billing_period
          ? new Date(`${invoice.billing_period}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          : 'Current period',
        monthlyRent: invoice.rent_charge,
        electricity: invoice.utility_charge,
        water: 'Included',
        totalDue: invoice.total_amount,
        dueDate: invoice.due_date,
        paidAmount,
        receiptAmount: latestPayment?.amount_paid || 0,
        outstanding,
        receiptNumber: latestPayment?.reference_no || null,
        paymentDate: latestPayment?.payment_date || null,
        paymentMethod: latestPayment?.payment_method || null,
      };
    }

    return { month: '', monthlyRent: 0, electricity: 0, water: 'Included', totalDue: 0, dueDate: 'Pending room assignment', paidAmount: 0, outstanding: 0 };
  } catch (error) {
    console.warn('Could not fetch billing breakdown:', error.message || error);
    return { month: '', monthlyRent: 0, electricity: 0, water: 'Included', totalDue: 0, dueDate: 'Pending room assignment', paidAmount: 0, outstanding: 0 };
  }
}

/**
 * Tenant due-date extension requests.
 */
export async function getTenantExtensionRequests(tenantId) {
  const store = await getStore();
  const requests = store[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] || [];
  return requests
    .filter((request) => request.tenant_id === tenantId)
    .sort((a, b) => (Date.parse(b.requested_at) || 0) - (Date.parse(a.requested_at) || 0))
    .map((request) => ({
      id: request.id,
      currentDueDate: request.current_due_date,
      requestedDueDate: request.requested_due_date,
      reason: request.reason,
      status: request.status,
      date: request.requested_at,
    }));
}

export async function submitDueDateExtensionRequest({ tenantId, requestedDueDate, reason = '' }) {
  const store = await getStore();
  const tenant = (store[COLLECTIONS.TENANTS] || []).find((item) => item.id === tenantId);
  if (!tenant) throw new Error('Your tenant profile is not available. Please sign in again.');

  const lease = (store[COLLECTIONS.LEASES] || []).find((item) => item.tenant_id === tenant.id && item.status === 'active');
  if (!lease) throw new Error('Your active lease could not be found. Please contact the property administrator.');

  const invoice = getLatestInvoiceForLease(store[COLLECTIONS.INVOICES] || [], lease.id);
  if (!invoice) throw new Error('There is no current invoice to request an extension for.');

  const existingRequest = (store[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] || []).find(
    (request) => request.tenant_id === tenant.id && request.invoice_id === invoice.id && request.status === 'pending'
  );
  if (existingRequest) throw new Error('You already have a pending extension request for this invoice.');

  const requestId = `extension-${Date.now()}`;
  const request = {
    id: requestId,
    tenant_id: tenant.id,
    invoice_id: invoice.id,
    current_due_date: invoice.due_date,
    requested_due_date: requestedDueDate,
    reason: reason.trim(),
    status: 'pending',
    requested_at: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };

  if (isFirebaseConfigured && db) {
    try {
      await writeDocument(COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS, requestId, request);
    } catch (error) {
      if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
        throw new Error('The server has not enabled due-date requests yet. Ask the administrator to publish the updated Firestore rules, then try again.');
      }
      throw error;
    }
  } else {
    const mockStore = getNormalizedMockDatabase();
    const requests = mockStore[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] || (mockStore[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] = []);
    requests.unshift(request);
  }

  return {
    id: request.id,
    currentDueDate: request.current_due_date,
    requestedDueDate: request.requested_due_date,
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

/**
 * 16. Submit Complaint (Direct to Firebase Firestore)
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

    if (isFirebaseConfigured && db) {
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
 * 17. Available rooms for a tenant transfer request.
 */
export async function getAvailableRoomsForChange() {
  try {
    const store = await getStore();
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const room_types = store[COLLECTIONS.ROOM_TYPES] || [];

    return rooms
      .filter((room) => room.status === 'vacant')
      .map((room) => {
        const type = room_types.find((roomType) => roomType.id === room.type_id);
        return {
          id: room.id,
          number: room.room_number.replace(/^0/, ''),
          type: type?.name || 'Room',
          monthlyRent: type?.base_rent || 2500,
        };
      });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    throw error;
  }
}

/**
 * 18. Tenant room-change requests scoped to a tenant.
 */
export async function getTenantRoomChangeRequests(tenantId) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const room_types = store[COLLECTIONS.ROOM_TYPES] || [];
    const requests = store[COLLECTIONS.ROOM_CHANGE_REQUESTS] || [];

    const tenant = tenants.find((item) => item.id === tenantId);

    if (!tenant) return [];

    return requests
      .filter((request) => request.tenant_id === tenant.id)
      .map((request) => {
        const room = rooms.find((item) => item.id === request.requested_room_id);
        const type = room && room_types.find((item) => item.id === room.type_id);
        return {
          id: request.id,
          roomNumber: room?.room_number.replace(/^0/, '') || '-',
          roomType: type?.name || 'Room',
          reason: request.reason,
          status: request.status,
          date: request.requested_at,
        };
      });
  } catch (error) {
    console.error('Error fetching room change requests:', error);
    throw error;
  }
}

/**
 * 19. Submit a tenant room-change request (Direct to Firebase Firestore).
 */
export async function submitRoomChangeRequest({ requestedRoomId, reason, tenantId }) {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const room_types = store[COLLECTIONS.ROOM_TYPES] || [];

    const tenant = tenants.find((item) => item.id === tenantId);
    if (!tenant) throw new Error('Your tenant profile is not available yet. Please contact the property administrator.');

    const currentLease = leases.find((lease) => lease.tenant_id === tenant.id && lease.status === 'active');
    const requestedRoom = rooms.find((room) => room.id === requestedRoomId && room.status === 'vacant');

    if (!requestedRoom) throw new Error('The selected room is no longer available.');

    const newId = `room-change-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newRequest = {
      id: newId,
      tenant_id: tenant.id,
      current_room_id: currentLease?.room_id || null,
      requested_room_id: requestedRoom.id,
      reason,
      status: 'pending',
      requested_at: dateStr,
    };

    if (isFirebaseConfigured && db) {
      await writeDocument(COLLECTIONS.ROOM_CHANGE_REQUESTS, newId, newRequest);
    } else {
      const mockStore = getNormalizedMockDatabase();
      const mockReqs = mockStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] || (mockStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] = []);
      mockReqs.unshift(newRequest);
    }

    const type = room_types.find((item) => item.id === requestedRoom.type_id);
    return {
      id: newRequest.id,
      roomNumber: requestedRoom.room_number.replace(/^0/, ''),
      roomType: type?.name || 'Room',
      reason,
      status: 'pending',
      date: newRequest.requested_at,
    };
  } catch (error) {
    console.error('Error submitting room change request:', error);
    throw new Error(error.message || 'Failed to submit room change request. Please try again.');
  }
}

/**
 * 20. All room-change requests for caretaker review.
 */
export async function getRoomChangeRequests() {
  try {
    const store = await getStore();
    const requests = store[COLLECTIONS.ROOM_CHANGE_REQUESTS] || [];
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const room_types = store[COLLECTIONS.ROOM_TYPES] || [];

    return requests.map((request) => {
      const tenant = tenants.find((item) => item.id === request.tenant_id);
      const currentRoom = rooms.find((item) => item.id === request.current_room_id);
      const requestedRoom = rooms.find((item) => item.id === request.requested_room_id);
      const requestedType = requestedRoom && room_types.find((item) => item.id === requestedRoom.type_id);
      return {
        id: request.id,
        tenant: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant',
        initials: tenant?.initials || 'TN',
        color: tenant?.avatar_color || '#8b5cf6',
        currentRoom: currentRoom?.room_number.replace(/^0/, '') || '-',
        requestedRoom: requestedRoom?.room_number.replace(/^0/, '') || '-',
        requestedRoomType: requestedType?.name || 'Room',
        reason: request.reason,
        status: request.status,
        date: request.requested_at,
      };
    });
  } catch (error) {
    console.error('Error fetching room change requests:', error);
    return [];
  }
}

/**
 * 21. Caretaker decision for a room-change request (Direct to Firebase Firestore).
 */
export async function reviewRoomChangeRequest(requestId, decision) {
  try {
    if (!['approved', 'declined'].includes(decision)) throw new Error('Invalid room-change decision.');

    const store = await getStore();
    const requests = store[COLLECTIONS.ROOM_CHANGE_REQUESTS] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];

    const request = requests.find((item) => item.id === requestId);
    if (!request || request.status !== 'pending') throw new Error('This request is no longer available for review.');

    const todayStr = new Date().toISOString().split('T')[0];

    if (decision === 'approved') {
      const requestedRoom = rooms.find((room) => room.id === request.requested_room_id);
      const currentRoom = rooms.find((room) => room.id === request.current_room_id);
      const currentLease = leases.find((lease) => lease.tenant_id === request.tenant_id && lease.status === 'active');
      if (!requestedRoom || requestedRoom.status !== 'vacant') throw new Error('The requested room is no longer available.');

      if (isFirebaseConfigured && db) {
        if (currentLease) {
          await updateDocument(COLLECTIONS.LEASES, currentLease.id, { status: 'terminated', end_date: todayStr });
          const newLeaseId = `lease-${Date.now()}`;
          await writeDocument(COLLECTIONS.LEASES, newLeaseId, {
            tenant_id: request.tenant_id,
            room_id: requestedRoom.id,
            start_date: todayStr,
            agreed_monthly_rent: currentLease.agreed_monthly_rent,
            due_day: currentLease.due_day,
            status: 'active',
          });
        }
        if (currentRoom) {
          await updateDocument(COLLECTIONS.ROOMS, currentRoom.id, { status: 'vacant' });
        }
        await updateDocument(COLLECTIONS.ROOMS, requestedRoom.id, { status: 'occupied' });
        await updateDocument(COLLECTIONS.ROOM_CHANGE_REQUESTS, requestId, { status: decision, reviewed_at: todayStr });
      } else {
        const mockStore = getNormalizedMockDatabase();
        const mockLeases = mockStore[COLLECTIONS.LEASES];
        const mockRooms = mockStore[COLLECTIONS.ROOMS];
        const mockRequests = mockStore[COLLECTIONS.ROOM_CHANGE_REQUESTS];

        const mockCurrentLease = mockLeases.find((lease) => lease.tenant_id === request.tenant_id && lease.status === 'active');
        const mockRequestedRoom = mockRooms.find((room) => room.id === request.requested_room_id);
        const mockCurrentRoom = mockRooms.find((room) => room.id === request.current_room_id);
        const mockReq = mockRequests.find((r) => r.id === requestId);

        if (mockCurrentLease) {
          mockCurrentLease.status = 'terminated';
          mockCurrentLease.end_date = todayStr;
          mockLeases.unshift({
            id: `lease-${mockLeases.length + 1}`,
            tenant_id: request.tenant_id,
            room_id: mockRequestedRoom.id,
            start_date: todayStr,
            agreed_monthly_rent: mockCurrentLease.agreed_monthly_rent,
            due_day: mockCurrentLease.due_day,
            status: 'active',
          });
        }
        if (mockCurrentRoom) mockCurrentRoom.status = 'vacant';
        if (mockRequestedRoom) mockRequestedRoom.status = 'occupied';
        if (mockReq) {
          mockReq.status = decision;
          mockReq.reviewed_at = todayStr;
        }
      }
    } else {
      // Declined
      if (isFirebaseConfigured && db) {
        await updateDocument(COLLECTIONS.ROOM_CHANGE_REQUESTS, requestId, { status: decision, reviewed_at: todayStr });
      } else {
        request.status = decision;
        request.reviewed_at = todayStr;
      }
    }

    const allRequests = await getRoomChangeRequests();
    return allRequests.find((item) => item.id === requestId);
  } catch (error) {
    console.error('Error reviewing room change request:', error);
    throw error;
  }
}

/**
 * 22. Billing data: Rent billing list
 */
export async function getRentBilling() {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];

    return tenants
      .filter((tenant) => {
        const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
        return !!lease;
      })
      .map((tenant) => {
        const lease = leases.find((l) => l.tenant_id === tenant.id && l.status === 'active');
        const room = rooms.find((r) => r.id === lease.room_id);
        const invoice = invoices.find((inv) => inv.lease_id === lease.id);
        const balance = invoice ? getInvoiceBalance(invoice.id, store) : 0;
        const status = balance > 0 ? 'unpaid' : 'paid';

        return {
          id: String(tenant.id).replace('tenant-', ''),
          name: `${tenant.first_name} ${tenant.last_name}`,
          initials: tenant.initials,
          room: room ? `R${parseInt(room.room_number, 10)}` : 'R?',
          dueDate: invoice ? invoice.due_date.replace(', 2026', '') : 'Oct 5',
          amount: lease.agreed_monthly_rent,
          status,
          color: tenant.avatar_color || '#8b5cf6',
        };
      });
  } catch (error) {
    console.error('Error fetching rent billing:', error);
    return [];
  }
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

    return utility_readings.map((reading) => {
      const room = rooms.find((r) => r.id === reading.room_id);
      const lease = leases.find((l) => l.room_id === reading.room_id && l.status === 'active');
      const tenant = lease ? tenants.find((t) => t.id === lease.tenant_id) : null;
      const usage = reading.curr_kwh - reading.prev_kwh;
      const amount = Math.round(usage * (reading.rate_per_kwh || 12.0));

      return {
        id: String(reading.id).replace('read-', ''),
        name: tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Vacant',
        initials: tenant ? tenant.initials : '--',
        prevKwh: reading.prev_kwh,
        currKwh: reading.curr_kwh,
        usage,
        amount,
        color: tenant ? tenant.avatar_color : '#999',
      };
    });
  } catch (error) {
    console.error('Error fetching utility bills:', error);
    return [];
  }
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
 * 25. Add a new announcement (Direct to Firebase Firestore)
 */
export async function addAnnouncement({ category, title, description }) {
  try {
    const newId = `ann-${Date.now()}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newAnnouncement = {
      id: newId,
      house_id: 'bh-1',
      author_user_id: auth?.currentUser?.uid || 'user-caretaker-1',
      category,
      title,
      description,
      created_at: dateStr,
    };

    if (isFirebaseConfigured && db) {
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
 * 26. Update complaint status (Direct to Firebase Firestore)
 */
export async function updateComplaintStatus(complaintId, newStatus) {
  try {
    const formattedId = complaintId.startsWith('comp-') ? complaintId : `comp-${complaintId}`;
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (isFirebaseConfigured && db) {
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

export { seedFirestoreDatabase };
