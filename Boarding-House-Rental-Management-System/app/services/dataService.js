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

  if (role === 'owner' || role === 'caretaker' || role === 'landlord') {
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
  const [boardingHouses, roomTypes, rooms, leases, complaints, announcements, extensionRequests, roomChangeRequests] = await Promise.all([
    readCollection(COLLECTIONS.BOARDING_HOUSES),
    readCollection(COLLECTIONS.ROOM_TYPES),
    readCollection(COLLECTIONS.ROOMS),
    readWhere(COLLECTIONS.LEASES, 'tenant_id', tenant.id),
    readWhere(COLLECTIONS.COMPLAINTS, 'tenant_id', tenant.id),
    readCollection(COLLECTIONS.ANNOUNCEMENTS),
    readWhere(COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS, 'tenant_id', tenant.id).catch(() => []),
    readWhere(COLLECTIONS.ROOM_CHANGE_REQUESTS, 'tenant_id', tenant.id).catch(() => []),
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
  tenantStore[COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS] = extensionRequests;
  tenantStore[COLLECTIONS.ROOM_CHANGE_REQUESTS] = roomChangeRequests;
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

  if (isFirebaseConfigured && db) {
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
 * 17. Billing data: Rent billing list
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
    return [];
  }
}

/**
 * 27. Get all pending tenant registrations awaiting landlord approval
 */
export async function getPendingTenantRegistrations() {
  try {
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    
    return tenants
      .filter((tenant) => tenant.account_status === 'pending')
      .map((tenant) => ({
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
      }))
      .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));
  } catch (error) {
    console.error('Error fetching pending tenants:', error);
    return [];
  }
}

/**
 * 28. Approve tenant and create lease with initial invoice (Transaction)
 * Creates:
 * - Updates tenant status to 'approved'
 * - Creates new lease with security deposit
 * - Creates initial invoice (advance + deposit)
 * - Updates room status to 'occupied'
 * - Creates approval notification
 */
export async function approveTenant({ tenantId, roomId, monthlyRent, dueDay, approvedBy }) {
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
    
    const dueDayNum = parseInt(dueDay, 10);
    if (isNaN(dueDayNum) || dueDayNum < 1 || dueDayNum > 31) throw new Error('Due day must be between 1 and 31');
    
    const now = new Date();
    const approvedAtStr = now.toISOString();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const startDate = now.toISOString().split('T')[0];
    
    // Calculate due date (next month, on due day)
    const dueDate = new Date(now);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(dueDayNum);
    const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const leaseId = `lease-${Date.now()}`;
    const invoiceId = `invoice-${Date.now()}`;
    const notificationId = `notif-${Date.now()}`;
    
    // Create records
    const updatedTenant = {
      ...tenant,
      account_status: 'approved',
      approved_at: approvedAtStr,
      approved_by: approvedBy || auth?.currentUser?.uid || 'landlord-uid-1',
    };
    
    const newLease = {
      id: leaseId,
      tenant_id: tenantId,
      room_id: roomId,
      start_date: startDate,
      end_date: null,
      agreed_monthly_rent: rent,
      due_day_of_month: dueDayNum,
      security_deposit_amount: rent,
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
      security_deposit: rent,
      other_charges: 0,
      total_amount: rent * 2,
      due_date: dueDateStr,
      status: 'unpaid',
      created_at: approvedAtStr,
      notes: 'Initial payment: 1 month advance + security deposit',
    };
    
    const notification = {
      id: notificationId,
      tenant_id: tenantId,
      type: 'approval',
      title: 'Welcome! Your application was approved',
      message: `Your account has been approved. You've been assigned to Room ${room.room_number}. Your initial payment of ₱${(rent * 2).toLocaleString()} (1 month advance + security deposit) is due on ${dueDateStr}.`,
      read: false,
      created_at: approvedAtStr,
      related_invoice_id: invoiceId,
    };
    
    // Persist to database
    if (isFirebaseConfigured && db) {
      // Use Firestore batch for atomicity
      const { writeBatch, doc } = await getFirestoreFns();
      const batch = writeBatch(db);
      
      batch.update(doc(db, COLLECTIONS.TENANTS, tenantId), {
        account_status: 'approved',
        approved_at: approvedAtStr,
        approved_by: updatedTenant.approved_by,
      });
      
      batch.set(doc(db, COLLECTIONS.LEASES, leaseId), newLease);
      batch.set(doc(db, COLLECTIONS.INVOICES, invoiceId), newInvoice);
      batch.update(doc(db, COLLECTIONS.ROOMS, roomId), { status: 'occupied' });
      batch.set(doc(db, COLLECTIONS.TENANT_NOTIFICATIONS, notificationId), notification);
      
      await batch.commit();
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
      
      const mockRoom = (mockStore[COLLECTIONS.ROOMS] || []).find((r) => r.id === roomId);
      if (mockRoom) mockRoom.status = 'occupied';
      
      if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) {
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
      }
      mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
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
      created_at: rejectedAtStr,
      related_invoice_id: null,
    };
    
    if (isFirebaseConfigured && db) {
      const { writeBatch, doc } = await getFirestoreFns();
      const batch = writeBatch(db);
      
      batch.update(doc(db, COLLECTIONS.TENANTS, tenantId), {
        account_status: 'rejected',
        rejected_at: rejectedAtStr,
        rejection_reason: reason,
      });
      
      batch.set(doc(db, COLLECTIONS.TENANT_NOTIFICATIONS, notificationId), notification);
      
      await batch.commit();
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
    
    const totalCollected = tenantPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const outstandingBalance = tenantInvoices.reduce((sum, inv) => {
      const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
      const paidAmount = invPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
      return sum + Math.max(0, inv.total_amount - paidAmount);
    }, 0);
    
    return {
      tenantId,
      name: `${tenant.first_name} ${tenant.last_name}`,
      accountStatus: tenant.account_status,
      hasLease: true,
      totalCollected,
      outstandingBalance,
      securityDeposit: activeLease.security_deposit_amount || 0,
      securityDepositPaid: activeLease.security_deposit_paid || false,
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
      .reduce((sum, payment) => sum + (Number(payment.amount_paid) || 0), 0);
    const balance = Math.max(0, (Number(invoice.total_amount) || 0) - paid);
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
          
          const balance = tenantInvoices.reduce((sum, inv) => {
            const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
            const paidAmount = invPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
            return sum + Math.max(0, inv.total_amount - paidAmount);
          }, 0);
          
          // Find latest unpaid invoice to check if overdue
          const unpaidInvoices = tenantInvoices.filter((inv) => {
            const invPayments = tenantPayments.filter((p) => p.invoice_id === inv.id);
            const paidAmount = invPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
            return inv.total_amount > paidAmount;
          });
          
          let isOverdue = false;
          if (unpaidInvoices.length > 0) {
            isOverdue = unpaidInvoices.some((inv) => {
              const dueDate = new Date(inv.due_date);
              return dueDate < now;
            });
          }
          
          const lastPayment = tenantPayments.length > 0 
            ? tenantPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))[0]
            : null;
          
          return {
            id: tenant.id.replace('tenant-', ''),
            tenantId: tenant.id,
            name: `${tenant.first_name} ${tenant.last_name}`,
            initials: tenant.initials,
            color: tenant.avatar_color,
            roomNumber: room ? parseInt(room.room_number, 10) : null,
            monthlyRent: activeLease.agreed_monthly_rent,
            balance,
            lastPayment: lastPayment ? lastPayment.payment_date : null,
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
      filteredTenants = filteredTenants.filter((t) => t.balance > 0 && !t.isOverdue);
    } else if (filter === 'overdue') {
      filteredTenants = filteredTenants.filter((t) => t.isOverdue);
    }
    
    return filteredTenants;
  } catch (error) {
    console.error('Error fetching tenants with financial status:', error);
    return [];
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
        return {
          id: payment.id,
          amount: payment.amount_paid,
          date: payment.payment_date,
          method: payment.payment_method,
          referenceNo: payment.reference_no,
          invoiceId: payment.invoice_id,
          billingPeriod: invoice ? invoice.billing_period : null,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
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
    const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    const balance = Math.max(0, invoice.total_amount - totalPaid);
    
    const lease = leases.find((l) => l.id === invoice.lease_id);
    const tenant = lease ? tenants.find((t) => t.id === lease.tenant_id) : null;
    const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
    
    return {
      ...invoice,
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
    const tenants = store[COLLECTIONS.TENANTS] || [];
    
    // Validation
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) throw new Error('Payment amount must be greater than zero');
    
    const payDate = new Date(paymentDate);
    if (isNaN(payDate.getTime())) throw new Error('Invalid payment date');
    if (payDate > new Date()) throw new Error('Payment date cannot be in the future');
    
    if (!['cash', 'gcash', 'bank_transfer'].includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }
    
    // Calculate new invoice status
    const existingPayments = payments.filter((p) => p.invoice_id === invoiceId);
    const totalPaid = existingPayments.reduce((sum, p) => sum + (p.amount_paid || 0), 0) + amount;
    const newBalance = Math.max(0, invoice.total_amount - totalPaid);
    
    let newStatus = 'unpaid';
    if (totalPaid >= invoice.total_amount) {
      newStatus = 'paid';
    } else if (totalPaid > 0) {
      newStatus = 'partial';
    }
    
    const paymentId = `payment-${Date.now()}`;
    const payDateStr = payDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    const newPayment = {
      id: paymentId,
      invoice_id: invoiceId,
      amount_paid: amount,
      payment_date: payDateStr,
      payment_method: paymentMethod,
      reference_no: referenceNo.trim() || `${paymentMethod.toUpperCase()}-${Date.now()}`,
      received_by_user_id: receivedBy || auth?.currentUser?.uid || 'landlord-uid-1',
      notes: String(notes || '').trim(),
    };
    
    // Create notification for tenant
    const lease = leases.find((l) => l.id === invoice.lease_id);
    if (lease) {
      const notificationId = `notif-${Date.now()}`;
      const notification = {
        id: notificationId,
        tenant_id: lease.tenant_id,
        type: 'payment_recorded',
        title: 'Payment Received',
        message: `Your payment of ₱${amount.toLocaleString()} has been recorded. Receipt: ${newPayment.reference_no}. Remaining balance: ₱${newBalance.toLocaleString()}.`,
        read: false,
        created_at: new Date().toISOString(),
        related_invoice_id: invoiceId,
      };
      
      if (isFirebaseConfigured && db) {
        const { writeBatch, doc } = await getFirestoreFns();
        const batch = writeBatch(db);
        
        batch.set(doc(db, COLLECTIONS.PAYMENTS, paymentId), newPayment);
        batch.update(doc(db, COLLECTIONS.INVOICES, invoiceId), { status: newStatus });
        batch.set(doc(db, COLLECTIONS.TENANT_NOTIFICATIONS, notificationId), notification);
        
        // Update security deposit paid status if this is initial invoice
        if (invoice.invoice_type === 'initial' && newStatus === 'paid') {
          batch.update(doc(db, COLLECTIONS.LEASES, invoice.lease_id), { security_deposit_paid: true });
        }
        
        await batch.commit();
      } else {
        const mockStore = getNormalizedMockDatabase();
        mockStore[COLLECTIONS.PAYMENTS].push(newPayment);
        
        const mockInvoice = (mockStore[COLLECTIONS.INVOICES] || []).find((inv) => inv.id === invoiceId);
        if (mockInvoice) mockInvoice.status = newStatus;
        
        if (!mockStore[COLLECTIONS.TENANT_NOTIFICATIONS]) {
          mockStore[COLLECTIONS.TENANT_NOTIFICATIONS] = [];
        }
        mockStore[COLLECTIONS.TENANT_NOTIFICATIONS].unshift(notification);
        
        if (invoice.invoice_type === 'initial' && newStatus === 'paid') {
          const mockLease = (mockStore[COLLECTIONS.LEASES] || []).find((l) => l.id === invoice.lease_id);
          if (mockLease) mockLease.security_deposit_paid = true;
        }
      }
    }
    
    return {
      success: true,
      payment: newPayment,
      newInvoiceStatus: newStatus,
      remainingBalance: newBalance,
      message: `Payment of ₱${amount.toLocaleString()} recorded successfully.`,
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
      .filter((notif) => notif.tenant_id === tenantId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch (error) {
    console.error('Error fetching tenant notifications:', error);
    return [];
  }
}

/**
 * 37. Mark notification as read
 */
export async function markNotificationAsRead(notificationId) {
  try {
    if (isFirebaseConfigured && db) {
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
    
    if (isFirebaseConfigured && db) {
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
    const store = await getStore();
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    
    const tenant = tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');
    
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) throw new Error('Invoice not found');
    
    const proofId = `proof-${Date.now()}`;
    const now = new Date().toISOString();
    
    const paymentProof = {
      id: proofId,
      tenant_id: tenantId,
      invoice_id: invoiceId,
      amount: parseFloat(amount),
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
    
    if (isFirebaseConfigured && db) {
      await writeDocument(COLLECTIONS.PAYMENT_PROOFS, proofId, paymentProof);
    } else {
      const mockStore = getNormalizedMockDatabase();
      if (!mockStore[COLLECTIONS.PAYMENT_PROOFS]) {
        mockStore[COLLECTIONS.PAYMENT_PROOFS] = [];
      }
      mockStore[COLLECTIONS.PAYMENT_PROOFS].push(paymentProof);
    }
    
    // Create notification for landlord (optional)
    await createNotification({
      tenantId,
      type: 'payment_proof_submitted',
      title: 'Payment Proof Submitted',
      message: `Payment proof for ₱${amount.toLocaleString()} submitted and awaiting verification.`,
    });
    
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
    const tenants = store[COLLECTIONS.TENANTS] || [];
    const invoices = store[COLLECTIONS.INVOICES] || [];
    const leases = store[COLLECTIONS.LEASES] || [];
    const rooms = store[COLLECTIONS.ROOMS] || [];
    
    return proofs
      .filter((proof) => proof.status === 'pending')
      .map((proof) => {
        const tenant = tenants.find((t) => t.id === proof.tenant_id);
        const invoice = invoices.find((inv) => inv.id === proof.invoice_id);
        const lease = invoice ? leases.find((l) => l.id === invoice.lease_id) : null;
        const room = lease ? rooms.find((r) => r.id === lease.room_id) : null;
        
        return {
          id: proof.id,
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
          proofImageUrl: proof.proof_image_url,
          notes: proof.notes,
          submittedAt: proof.submitted_at,
        };
      })
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
    
    return proofs
      .filter((proof) => proof.tenant_id === tenantId)
      .map((proof) => {
        const invoice = invoices.find((inv) => inv.id === proof.invoice_id);
        
        return {
          id: proof.id,
          invoiceId: proof.invoice_id,
          invoicePeriod: invoice?.billing_period || '-',
          amount: proof.amount,
          paymentDate: proof.payment_date,
          paymentMethod: proof.payment_method,
          referenceNo: proof.reference_no,
          proofImageUrl: proof.proof_image_url,
          notes: proof.notes,
          status: proof.status,
          submittedAt: proof.submitted_at,
          reviewedAt: proof.reviewed_at,
          rejectionReason: proof.rejection_reason,
        };
      })
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
    if (proof.status !== 'pending') throw new Error('Payment proof has already been reviewed');
    
    const now = new Date().toISOString();
    
    // Update proof status
    if (isFirebaseConfigured && db) {
      await updateDocument(COLLECTIONS.PAYMENT_PROOFS, proofId, {
        status: 'approved',
        reviewed_at: now,
        reviewed_by_user_id: reviewerUserId,
      });
      
      // Record the actual payment
      await recordPayment({
        invoiceId: proof.invoice_id,
        amount: proof.amount,
        paymentDate: proof.payment_date,
        paymentMethod: proof.payment_method,
        referenceNo: proof.reference_no,
        receivedBy: reviewerUserId,
      });
    } else {
      proof.status = 'approved';
      proof.reviewed_at = now;
      proof.reviewed_by_user_id = reviewerUserId;
      
      // Record the actual payment
      await recordPayment({
        invoiceId: proof.invoice_id,
        amount: proof.amount,
        paymentDate: proof.payment_date,
        paymentMethod: proof.payment_method,
        referenceNo: proof.reference_no,
        receivedBy: reviewerUserId,
      });
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
    
    if (isFirebaseConfigured && db) {
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
