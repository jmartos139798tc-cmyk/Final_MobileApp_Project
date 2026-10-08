/**
 * 3NF Normalized Database Seeder & Mock Store
 * 
 * Provides:
 * 1. `getNormalizedMockDatabase()`: Full normalized relational database representation
 * 2. `seedFirestoreDatabase(db)`: Direct batch seeder to push all collections to Firestore
 */

import { COLLECTIONS } from './databaseSchema.js';

export const SEED_DATA = {
  // 1. USERS
  [COLLECTIONS.USERS]: [],

  [COLLECTIONS.STAFF_PROFILES]: [],

  // 2. BOARDING_HOUSES
  [COLLECTIONS.BOARDING_HOUSES]: [
    {
      id: 'bh-1',
      name: 'Nads & Gracy Boarding House',
      address: 'University Belt, Manila',
      default_kwh_rate: 12.0,
      created_at: '2026-01-01',
    },
  ],

  // 3. ROOM_TYPES (Keep room types for adding rooms)
  [COLLECTIONS.ROOM_TYPES]: [
    { id: 'type-single', name: 'Single Occupancy', base_rent: 2500, max_capacity: 1, description: 'Private room with single bed and study desk' },
    { id: 'type-double', name: 'Double Occupancy', base_rent: 3500, max_capacity: 2, description: 'Shared room with bunk beds and shared closet' },
  ],

  // 4. ROOMS
  [COLLECTIONS.ROOMS]: [
    { id: 'room-1', house_id: 'bh-1', room_number: '01', type_id: 'type-single', status: 'occupied' },
    { id: 'room-2', house_id: 'bh-1', room_number: '02', type_id: 'type-double', status: 'occupied' },
    { id: 'room-3', house_id: 'bh-1', room_number: '03', type_id: 'type-single', status: 'vacant' },
    { id: 'room-4', house_id: 'bh-1', room_number: '04', type_id: 'type-single', status: 'vacant' },
    { id: 'room-5', house_id: 'bh-1', room_number: '05', type_id: 'type-double', status: 'vacant' },
  ],

  // 5. TENANTS (2 approved with leases, 2 pending approval)
  [COLLECTIONS.TENANTS]: [
    // Approved tenants
    {
      id: 'tenant-1',
      user_id: 'user-tenant-1',
      first_name: 'Maria',
      last_name: 'Santos',
      initials: 'MS',
      phone: '09171234567',
      avatar_color: '#8b5cf6',
      account_status: 'approved',
      approved_at: '2026-09-01T10:30:00Z',
      approved_by: 'landlord-uid-1',
      registered_at: '2026-08-28T14:20:00Z',
    },
    {
      id: 'tenant-2',
      user_id: 'user-tenant-2',
      first_name: 'Juan',
      last_name: 'Dela Cruz',
      initials: 'JD',
      phone: '09187654321',
      avatar_color: '#f59e0b',
      account_status: 'approved',
      approved_at: '2026-09-05T09:15:00Z',
      approved_by: 'landlord-uid-1',
      registered_at: '2026-09-02T11:45:00Z',
    },
    // Pending tenants (awaiting landlord approval)
    {
      id: 'tenant-3',
      user_id: 'user-tenant-3',
      first_name: 'Ana',
      last_name: 'Reyes',
      initials: 'AR',
      phone: '09191112222',
      avatar_color: '#10b981',
      account_status: 'pending',
      registered_at: '2026-10-08T16:30:00Z',
    },
    {
      id: 'tenant-4',
      user_id: 'user-tenant-4',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      initials: 'CM',
      phone: '09203334444',
      avatar_color: '#3b82f6',
      account_status: 'pending',
      registered_at: '2026-10-09T10:15:00Z',
    },
  ],

  // 6. LEASES (Active leases for approved tenants)
  [COLLECTIONS.LEASES]: [
    {
      id: 'lease-1',
      tenant_id: 'tenant-1',
      room_id: 'room-1',
      start_date: '2026-09-01',
      end_date: null,
      agreed_monthly_rent: 2500,
      due_day_of_month: 5,
      security_deposit_amount: 2500,
      security_deposit_paid: true,
      status: 'active',
    },
    {
      id: 'lease-2',
      tenant_id: 'tenant-2',
      room_id: 'room-2',
      start_date: '2026-09-05',
      end_date: null,
      agreed_monthly_rent: 3500,
      due_day_of_month: 5,
      security_deposit_amount: 3500,
      security_deposit_paid: true,
      status: 'active',
    },
  ],

  // 7. UTILITY_READINGS
  [COLLECTIONS.UTILITY_READINGS]: [
    {
      id: 'reading-1',
      room_id: 'room-1',
      billing_period: '2026-09',
      prev_kwh: 100,
      curr_kwh: 128,
      rate_per_kwh: 12.0,
      reading_date: '2026-09-30',
    },
    {
      id: 'reading-2',
      room_id: 'room-2',
      billing_period: '2026-09',
      prev_kwh: 120,
      curr_kwh: 145,
      rate_per_kwh: 12.0,
      reading_date: '2026-09-30',
    },
    {
      id: 'reading-3',
      room_id: 'room-1',
      billing_period: '2026-10',
      prev_kwh: 128,
      curr_kwh: 155,
      rate_per_kwh: 12.0,
      reading_date: '2026-10-08',
    },
    {
      id: 'reading-4',
      room_id: 'room-2',
      billing_period: '2026-10',
      prev_kwh: 145,
      curr_kwh: 168,
      rate_per_kwh: 12.0,
      reading_date: '2026-10-08',
    },
  ],

  // 8. INVOICES (Including initial invoices with security deposits)
  [COLLECTIONS.INVOICES]: [
    // Tenant 1 - Initial invoice (PAID)
    {
      id: 'invoice-1',
      lease_id: 'lease-1',
      billing_period: '2026-09',
      invoice_type: 'initial',
      rent_charge: 2500,
      utility_charge: 0,
      security_deposit: 2500,
      other_charges: 0,
      total_amount: 5000,
      due_date: 'Sep 05, 2026',
      status: 'paid',
      created_at: '2026-09-01T10:30:00Z',
      notes: 'Initial payment: 1 month advance + security deposit',
    },
    // Tenant 1 - September monthly invoice (PAID)
    {
      id: 'invoice-2',
      lease_id: 'lease-1',
      billing_period: '2026-09',
      invoice_type: 'monthly',
      rent_charge: 2500,
      utility_charge: 336,
      security_deposit: 0,
      other_charges: 0,
      total_amount: 2836,
      due_date: 'Oct 05, 2026',
      status: 'paid',
      created_at: '2026-09-30T16:00:00Z',
      notes: 'September billing: Rent + Electricity (28 kWh × ₱12)',
    },
    // Tenant 1 - October monthly invoice (UNPAID)
    {
      id: 'invoice-3',
      lease_id: 'lease-1',
      billing_period: '2026-10',
      invoice_type: 'monthly',
      rent_charge: 2500,
      utility_charge: 324,
      security_deposit: 0,
      other_charges: 0,
      total_amount: 2824,
      due_date: 'Nov 05, 2026',
      status: 'unpaid',
      created_at: '2026-10-08T09:00:00Z',
      notes: 'October billing: Rent + Electricity (27 kWh × ₱12)',
    },
    // Tenant 2 - Initial invoice (PAID)
    {
      id: 'invoice-4',
      lease_id: 'lease-2',
      billing_period: '2026-09',
      invoice_type: 'initial',
      rent_charge: 3500,
      utility_charge: 0,
      security_deposit: 3500,
      other_charges: 0,
      total_amount: 7000,
      due_date: 'Sep 10, 2026',
      status: 'paid',
      created_at: '2026-09-05T09:15:00Z',
      notes: 'Initial payment: 1 month advance + security deposit',
    },
    // Tenant 2 - September monthly invoice (PARTIAL)
    {
      id: 'invoice-5',
      lease_id: 'lease-2',
      billing_period: '2026-09',
      invoice_type: 'monthly',
      rent_charge: 3500,
      utility_charge: 300,
      security_deposit: 0,
      other_charges: 0,
      total_amount: 3800,
      due_date: 'Oct 05, 2026',
      status: 'partial',
      created_at: '2026-09-30T16:00:00Z',
      notes: 'September billing: Rent + Electricity (25 kWh × ₱12)',
    },
    // Tenant 2 - October monthly invoice (UNPAID)
    {
      id: 'invoice-6',
      lease_id: 'lease-2',
      billing_period: '2026-10',
      invoice_type: 'monthly',
      rent_charge: 3500,
      utility_charge: 276,
      security_deposit: 0,
      other_charges: 0,
      total_amount: 3776,
      due_date: 'Nov 05, 2026',
      status: 'unpaid',
      created_at: '2026-10-08T09:00:00Z',
      notes: 'October billing: Rent + Electricity (23 kWh × ₱12)',
    },
  ],

  // 9. PAYMENTS
  [COLLECTIONS.PAYMENTS]: [
    // Tenant 1 payments
    {
      id: 'payment-1',
      invoice_id: 'invoice-1',
      amount_paid: 5000,
      payment_date: 'Sep 03, 2026',
      payment_method: 'gcash',
      reference_no: 'GC-2026090312345',
      received_by_user_id: 'landlord-uid-1',
    },
    {
      id: 'payment-2',
      invoice_id: 'invoice-2',
      amount_paid: 2836,
      payment_date: 'Oct 03, 2026',
      payment_method: 'cash',
      reference_no: 'CASH-001',
      received_by_user_id: 'landlord-uid-1',
    },
    // Tenant 2 payments
    {
      id: 'payment-3',
      invoice_id: 'invoice-4',
      amount_paid: 7000,
      payment_date: 'Sep 08, 2026',
      payment_method: 'gcash',
      reference_no: 'GC-2026090854321',
      received_by_user_id: 'landlord-uid-1',
    },
    {
      id: 'payment-4',
      invoice_id: 'invoice-5',
      amount_paid: 2000,
      payment_date: 'Oct 04, 2026',
      payment_method: 'cash',
      reference_no: 'CASH-002',
      received_by_user_id: 'landlord-uid-1',
    },
  ],

  // 10. COMPLAINTS
  [COLLECTIONS.COMPLAINTS]: [
    {
      id: 'comp-1',
      tenant_id: 'tenant-1',
      room_id: 'room-1',
      title: 'Air conditioning not working',
      description: 'The AC unit has not been cooling properly for 3 days.',
      status: 'in-progress',
      filed_at: 'Oct 06, 2026',
      resolved_at: null,
    },
  ],

  // 11. ROOM_CHANGE_REQUESTS
  [COLLECTIONS.ROOM_CHANGE_REQUESTS]: [],

  [COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS]: [],

  // 12. ANNOUNCEMENTS
  [COLLECTIONS.ANNOUNCEMENTS]: [
    {
      id: 'ann-1',
      house_id: 'bh-1',
      author_user_id: 'landlord-uid-1',
      category: 'Payment',
      title: 'October Rent Reminder',
      description: 'Rent for October is due on November 5. Please prepare your payments.',
      created_at: 'Oct 08, 2026',
    },
  ],

  // 13. TENANT_NOTIFICATIONS (New collection)
  [COLLECTIONS.TENANT_NOTIFICATIONS]: [
    // Tenant 1 notifications
    {
      id: 'notif-1',
      tenant_id: 'tenant-1',
      type: 'approval',
      title: 'Welcome! Your application was approved',
      message: 'Your account has been approved. You\'ve been assigned to Room 01. Your initial payment of ₱5,000 (1 month advance + security deposit) is due on Sep 05, 2026.',
      read: true,
      created_at: '2026-09-01T10:30:00Z',
      related_invoice_id: 'invoice-1',
    },
    {
      id: 'notif-2',
      tenant_id: 'tenant-1',
      type: 'invoice_created',
      title: 'New Invoice: September 2026',
      message: 'Your invoice for September 2026 is ready. Amount: ₱2,836. Due: Oct 05, 2026.',
      read: true,
      created_at: '2026-09-30T16:00:00Z',
      related_invoice_id: 'invoice-2',
    },
    {
      id: 'notif-3',
      tenant_id: 'tenant-1',
      type: 'payment_recorded',
      title: 'Payment Received',
      message: 'Your payment of ₱2,836 has been recorded. Receipt: CASH-001. Remaining balance: ₱0.',
      read: true,
      created_at: '2026-10-03T14:20:00Z',
      related_invoice_id: 'invoice-2',
    },
    {
      id: 'notif-4',
      tenant_id: 'tenant-1',
      type: 'invoice_created',
      title: 'New Invoice: October 2026',
      message: 'Your invoice for October 2026 is ready. Amount: ₱2,824. Due: Nov 05, 2026.',
      read: false,
      created_at: '2026-10-08T09:00:00Z',
      related_invoice_id: 'invoice-3',
    },
    // Tenant 2 notifications
    {
      id: 'notif-5',
      tenant_id: 'tenant-2',
      type: 'approval',
      title: 'Welcome! Your application was approved',
      message: 'Your account has been approved. You\'ve been assigned to Room 02. Your initial payment of ₱7,000 (1 month advance + security deposit) is due on Sep 10, 2026.',
      read: true,
      created_at: '2026-09-05T09:15:00Z',
      related_invoice_id: 'invoice-4',
    },
    {
      id: 'notif-6',
      tenant_id: 'tenant-2',
      type: 'payment_recorded',
      title: 'Payment Received',
      message: 'Your payment of ₱2,000 has been recorded. Receipt: CASH-002. Remaining balance: ₱1,800.',
      read: false,
      created_at: '2026-10-04T15:10:00Z',
      related_invoice_id: 'invoice-5',
    },
  ],
};

// In-memory relational database state (clone of seed data)
let inMemory3NFStore = JSON.parse(JSON.stringify(SEED_DATA));

export function getNormalizedMockDatabase() {
  return inMemory3NFStore;
}

export function resetNormalizedMockDatabase() {
  inMemory3NFStore = JSON.parse(JSON.stringify(SEED_DATA));
  return inMemory3NFStore;
}

/**
 * Seeds all normalized collections into Firestore when a live Firebase project is connected.
 */
export async function seedFirestoreDatabase(firestoreInstance) {
  if (!firestoreInstance) throw new Error('Firestore instance required');
  const { doc, writeBatch } = await import('firebase/firestore');

  const batch = writeBatch(firestoreInstance);

  for (const [collectionName, records] of Object.entries(SEED_DATA)) {
    for (const record of records) {
      const docRef = doc(firestoreInstance, collectionName, record.id);
      batch.set(docRef, record);
    }
  }

  await batch.commit();
  return { success: true, message: 'Sample data uploaded to Firestore.' };
}
