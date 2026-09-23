/**
 * 3NF Normalized Database Seeder & Mock Store
 * 
 * Provides:
 * 1. `getNormalizedMockDatabase()`: Full 11-entity relational database representation
 * 2. `seedFirestoreDatabase(db)`: Direct batch seeder to push all 11 collections to Firestore
 */

import { COLLECTIONS } from './databaseSchema.js';

export const SEED_DATA = {
  // 1. USERS
  [COLLECTIONS.USERS]: [
    { id: 'user-owner-1', email: 'owner@bh.com', role: 'owner', name: 'Boarding House Owner', created_at: '2026-01-01' },
    { id: 'user-caretaker-1', email: 'caretaker@bh.com', role: 'caretaker', name: 'Property Caretaker', created_at: '2026-01-01' },
    { id: 'user-tenant-2', email: 'ana@bh.com', role: 'tenant', name: 'Ana Reyes', tenant_id: 'tenant-2', created_at: '2026-02-15' },
    { id: 'user-tenant-1', email: 'maria@bh.com', role: 'tenant', name: 'Maria Santos', tenant_id: 'tenant-1', created_at: '2026-01-10' },
  ],

  // 2. BOARDING_HOUSES
  [COLLECTIONS.BOARDING_HOUSES]: [
    {
      id: 'bh-1',
      name: 'Neat & Groovy BH',
      address: 'University Belt, Sampaloc, Manila',
      default_kwh_rate: 12.0,
      total_rooms: 17,
      created_at: '2026-01-01',
    },
  ],

  // 3. ROOM_TYPES (Eliminates transitive dependency from rooms)
  [COLLECTIONS.ROOM_TYPES]: [
    { id: 'type-single', name: 'Single Occupancy', base_rent: 2500, max_capacity: 1, description: 'Private room with single bed and study desk' },
    { id: 'type-double', name: 'Double Occupancy', base_rent: 3500, max_capacity: 2, description: 'Shared room with bunk beds and shared closet' },
  ],

  // 4. ROOMS (Physical spaces, strictly independent of tenants)
  [COLLECTIONS.ROOMS]: [
    { id: 'room-1', house_id: 'bh-1', room_number: '01', type_id: 'type-single', status: 'occupied' },
    { id: 'room-2', house_id: 'bh-1', room_number: '02', type_id: 'type-single', status: 'occupied' },
    { id: 'room-3', house_id: 'bh-1', room_number: '03', type_id: 'type-single', status: 'vacant' },
    { id: 'room-4', house_id: 'bh-1', room_number: '04', type_id: 'type-single', status: 'occupied' },
    { id: 'room-5', house_id: 'bh-1', room_number: '05', type_id: 'type-single', status: 'occupied' },
    { id: 'room-6', house_id: 'bh-1', room_number: '06', type_id: 'type-single', status: 'vacant' },
    { id: 'room-7', house_id: 'bh-1', room_number: '07', type_id: 'type-single', status: 'occupied' },
    { id: 'room-8', house_id: 'bh-1', room_number: '08', type_id: 'type-single', status: 'occupied' },
    { id: 'room-9', house_id: 'bh-1', room_number: '09', type_id: 'type-single', status: 'occupied' },
    { id: 'room-10', house_id: 'bh-1', room_number: '10', type_id: 'type-single', status: 'occupied' },
    { id: 'room-11', house_id: 'bh-1', room_number: '11', type_id: 'type-single', status: 'occupied' },
    { id: 'room-12', house_id: 'bh-1', room_number: '12', type_id: 'type-single', status: 'occupied' },
    { id: 'room-13', house_id: 'bh-1', room_number: '13', type_id: 'type-double', status: 'occupied' },
    { id: 'room-14', house_id: 'bh-1', room_number: '14', type_id: 'type-double', status: 'occupied' },
    { id: 'room-15', house_id: 'bh-1', room_number: '15', type_id: 'type-double', status: 'vacant' },
    { id: 'room-16', house_id: 'bh-1', room_number: '16', type_id: 'type-double', status: 'occupied' },
    { id: 'room-17', house_id: 'bh-1', room_number: '17', type_id: 'type-double', status: 'occupied' },
  ],

  // 5. TENANTS (Personal info, independent of current room)
  [COLLECTIONS.TENANTS]: [
    { id: 'tenant-1', user_id: 'user-tenant-1', first_name: 'Maria', last_name: 'Santos', initials: 'MS', phone: '0917-111-2233', avatar_color: '#ef4444' },
    { id: 'tenant-2', user_id: 'user-tenant-2', first_name: 'Ana', last_name: 'Reyes', initials: 'AR', phone: '0917-222-3344', avatar_color: '#8b5cf6' },
    { id: 'tenant-3', user_id: null, first_name: 'Joy', last_name: 'Cruz', initials: 'JC', phone: '0917-333-4455', avatar_color: '#3b82f6' },
    { id: 'tenant-4', user_id: null, first_name: 'Lyn', last_name: 'Bautista', initials: 'LB', phone: '0917-444-5566', avatar_color: '#10b981' },
    { id: 'tenant-5', user_id: null, first_name: 'Rose', last_name: 'Dela Cruz', initials: 'RD', phone: '0917-555-6677', avatar_color: '#ef4444' },
    { id: 'tenant-6', user_id: null, first_name: 'Claire', last_name: 'Flores', initials: 'CF', phone: '0917-666-7788', avatar_color: '#8b5cf6' },
    { id: 'tenant-7', user_id: null, first_name: 'Beth', last_name: 'Mendoza', initials: 'BM', phone: '0917-777-8899', avatar_color: '#3b82f6' },
    { id: 'tenant-8', user_id: null, first_name: 'Shei', last_name: 'Ramos', initials: 'SR', phone: '0917-888-9900', avatar_color: '#10b981' },
    { id: 'tenant-9', user_id: null, first_name: 'Cel', last_name: 'Garcia', initials: 'CG', phone: '0917-999-0011', avatar_color: '#f59e0b' },
    { id: 'tenant-10', user_id: null, first_name: 'Diane', last_name: 'Torres', initials: 'DT', phone: '0918-111-2233', avatar_color: '#ec4899' },
    { id: 'tenant-11', user_id: null, first_name: 'Tess', last_name: 'Villanueva', initials: 'TV', phone: '0918-222-3344', avatar_color: '#06b6d4' },
    { id: 'tenant-12', user_id: null, first_name: 'Karen', last_name: 'Silva', initials: 'KS', phone: '0918-333-4455', avatar_color: '#8b5cf6' },
    { id: 'tenant-13', user_id: null, first_name: 'Lisa', last_name: 'Mendez', initials: 'LM', phone: '0918-444-5566', avatar_color: '#f59e0b' },
    { id: 'tenant-14', user_id: null, first_name: 'Nina', last_name: 'Reyes', initials: 'NR', phone: '0918-555-6677', avatar_color: '#10b981' },
  ],

  // 6. LEASES (Tenancy agreements linking room and tenant over time)
  [COLLECTIONS.LEASES]: [
    { id: 'lease-1', tenant_id: 'tenant-1', room_id: 'room-1', start_date: '2026-01-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-2', tenant_id: 'tenant-2', room_id: 'room-2', start_date: '2026-02-15', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-3', tenant_id: 'tenant-3', room_id: 'room-4', start_date: '2026-01-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-4', tenant_id: 'tenant-4', room_id: 'room-5', start_date: '2026-03-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-5', tenant_id: 'tenant-5', room_id: 'room-7', start_date: '2026-01-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-6', tenant_id: 'tenant-6', room_id: 'room-8', start_date: '2026-02-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-7', tenant_id: 'tenant-7', room_id: 'room-9', start_date: '2026-01-15', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-8', tenant_id: 'tenant-8', room_id: 'room-10', start_date: '2026-01-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-9', tenant_id: 'tenant-9', room_id: 'room-11', start_date: '2026-01-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-10', tenant_id: 'tenant-10', room_id: 'room-12', start_date: '2026-02-01', agreed_monthly_rent: 2500, due_day: 5, status: 'active' },
    { id: 'lease-11', tenant_id: 'tenant-11', room_id: 'room-13', start_date: '2026-01-01', agreed_monthly_rent: 3500, due_day: 5, status: 'active' },
    { id: 'lease-12', tenant_id: 'tenant-12', room_id: 'room-14', start_date: '2026-01-01', agreed_monthly_rent: 3500, due_day: 5, status: 'active' },
    { id: 'lease-13', tenant_id: 'tenant-13', room_id: 'room-17', start_date: '2026-02-01', agreed_monthly_rent: 3500, due_day: 5, status: 'active' },
    { id: 'lease-14', tenant_id: 'tenant-14', room_id: 'room-16', start_date: '2026-01-01', agreed_monthly_rent: 3500, due_day: 5, status: 'active' },
  ],

  // 7. UTILITY_READINGS (Electricity per room per month)
  [COLLECTIONS.UTILITY_READINGS]: [
    { id: 'read-1', room_id: 'room-1', billing_period: '2026-09', prev_kwh: 110, curr_kwh: 135, rate_per_kwh: 12.0, reading_date: '2026-09-01' },
    { id: 'read-2', room_id: 'room-2', billing_period: '2026-09', prev_kwh: 120, curr_kwh: 148, rate_per_kwh: 12.14, reading_date: '2026-09-01' }, // 28 kWh = ₱340
    { id: 'read-3', room_id: 'room-4', billing_period: '2026-09', prev_kwh: 95, curr_kwh: 120, rate_per_kwh: 12.0, reading_date: '2026-09-01' },
    { id: 'read-4', room_id: 'room-5', billing_period: '2026-09', prev_kwh: 140, curr_kwh: 175, rate_per_kwh: 12.0, reading_date: '2026-09-01' },
  ],

  // 8. INVOICES (Monthly billing per lease)
  [COLLECTIONS.INVOICES]: [
    { id: 'inv-1', lease_id: 'lease-1', tenant_id: 'tenant-1', billing_period: '2026-09', rent_charge: 2500, utility_charge: 300, total_amount: 2800, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-2', lease_id: 'lease-2', tenant_id: 'tenant-2', billing_period: '2026-09', rent_charge: 2500, utility_charge: 340, total_amount: 2840, due_date: 'Oct 5, 2026', status: 'partial' },
    { id: 'inv-3', lease_id: 'lease-3', tenant_id: 'tenant-3', billing_period: '2026-09', rent_charge: 2500, utility_charge: 300, total_amount: 2800, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-4', lease_id: 'lease-4', tenant_id: 'tenant-4', billing_period: '2026-09', rent_charge: 2500, utility_charge: 420, total_amount: 2920, due_date: 'Oct 5, 2026', status: 'unpaid' },
    { id: 'inv-5', lease_id: 'lease-5', tenant_id: 'tenant-5', billing_period: '2026-09', rent_charge: 2500, utility_charge: 280, total_amount: 2780, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-6', lease_id: 'lease-6', tenant_id: 'tenant-6', billing_period: '2026-09', rent_charge: 2500, utility_charge: 290, total_amount: 2790, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-7', lease_id: 'lease-7', tenant_id: 'tenant-7', billing_period: '2026-09', rent_charge: 2500, utility_charge: 350, total_amount: 2850, due_date: 'Oct 5, 2026', status: 'partial' },
    { id: 'inv-8', lease_id: 'lease-8', tenant_id: 'tenant-8', billing_period: '2026-09', rent_charge: 2500, utility_charge: 310, total_amount: 2810, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-9', lease_id: 'lease-9', tenant_id: 'tenant-9', billing_period: '2026-09', rent_charge: 2500, utility_charge: 330, total_amount: 2830, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-10', lease_id: 'lease-10', tenant_id: 'tenant-10', billing_period: '2026-09', rent_charge: 2500, utility_charge: 350, total_amount: 2850, due_date: 'Oct 5, 2026', status: 'unpaid' },
    { id: 'inv-11', lease_id: 'lease-11', tenant_id: 'tenant-11', billing_period: '2026-09', rent_charge: 3500, utility_charge: 500, total_amount: 4000, due_date: 'Oct 5, 2026', status: 'paid' },
    { id: 'inv-12', lease_id: 'lease-12', tenant_id: 'tenant-12', billing_period: '2026-09', rent_charge: 3500, utility_charge: 520, total_amount: 4020, due_date: 'Oct 5, 2026', status: 'unpaid' },
    { id: 'inv-13', lease_id: 'lease-13', tenant_id: 'tenant-13', billing_period: '2026-09', rent_charge: 3500, utility_charge: 480, total_amount: 3980, due_date: 'Oct 5, 2026', status: 'partial' },
    { id: 'inv-14', lease_id: 'lease-14', tenant_id: 'tenant-14', billing_period: '2026-09', rent_charge: 3500, utility_charge: 490, total_amount: 3990, due_date: 'Oct 5, 2026', status: 'paid' },
  ],

  // 9. PAYMENTS (Transactions settling invoices)
  [COLLECTIONS.PAYMENTS]: [
    { id: 'pay-1', invoice_id: 'inv-1', amount_paid: 2800, payment_date: '2026-09-04', payment_method: 'gcash', reference_no: 'GCASH-984102', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-2', invoice_id: 'inv-2', amount_paid: 2340, payment_date: '2026-09-03', payment_method: 'cash', reference_no: 'OR-2026-0902', received_by_user_id: 'user-caretaker-1' }, // leaves ₱500 balance for Ana Reyes!
    { id: 'pay-3', invoice_id: 'inv-3', amount_paid: 2800, payment_date: '2026-09-05', payment_method: 'gcash', reference_no: 'GCASH-984201', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-5', invoice_id: 'inv-5', amount_paid: 2780, payment_date: '2026-09-02', payment_method: 'cash', reference_no: 'OR-2026-0905', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-6', invoice_id: 'inv-6', amount_paid: 2790, payment_date: '2026-09-04', payment_method: 'gcash', reference_no: 'GCASH-984322', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-7', invoice_id: 'inv-7', amount_paid: 2100, payment_date: '2026-09-04', payment_method: 'cash', reference_no: 'OR-2026-0907', received_by_user_id: 'user-caretaker-1' }, // leaves ₱750 balance for Beth
    { id: 'pay-8', invoice_id: 'inv-8', amount_paid: 2810, payment_date: '2026-09-03', payment_method: 'cash', reference_no: 'OR-2026-0908', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-9', invoice_id: 'inv-9', amount_paid: 2830, payment_date: '2026-09-05', payment_method: 'gcash', reference_no: 'GCASH-984411', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-11', invoice_id: 'inv-11', amount_paid: 4000, payment_date: '2026-09-02', payment_method: 'gcash', reference_no: 'GCASH-984501', received_by_user_id: 'user-caretaker-1' },
    { id: 'pay-13', invoice_id: 'inv-13', amount_paid: 2780, payment_date: '2026-09-05', payment_method: 'cash', reference_no: 'OR-2026-0913', received_by_user_id: 'user-caretaker-1' }, // leaves ₱1200 balance for Lisa
    { id: 'pay-14', invoice_id: 'inv-14', amount_paid: 3990, payment_date: '2026-09-03', payment_method: 'gcash', reference_no: 'GCASH-984601', received_by_user_id: 'user-caretaker-1' },
  ],

  // 10. COMPLAINTS
  [COLLECTIONS.COMPLAINTS]: [
    { id: 'comp-1', tenant_id: 'tenant-2', room_id: 'room-2', title: 'Leaking faucet in bathroom', description: 'Bathroom faucet drips continuously since yesterday.', status: 'pending', filed_at: 'Sep 12, 2026' },
    { id: 'comp-2', tenant_id: 'tenant-7', room_id: 'room-9', title: 'Faulty electrical outlet', description: 'Right socket sparks when plugging laptop charger.', status: 'in-progress', filed_at: 'Sep 10, 2026' },
    { id: 'comp-3', tenant_id: 'tenant-3', room_id: 'room-4', title: 'Window latch broken', description: 'Window latch is loose, won’t shut tight.', status: 'resolved', filed_at: 'Sep 8, 2026', resolved_at: 'Sep 9, 2026' },
    { id: 'comp-4', tenant_id: 'tenant-4', room_id: 'room-5', title: 'Ceiling fan not working', description: 'Ceiling fan speed 3 produces rattling sound.', status: 'pending', filed_at: 'Sep 14, 2026' },
  ],

  // 11. ANNOUNCEMENTS
  [COLLECTIONS.ANNOUNCEMENTS]: [
    { id: 'ann-1', house_id: 'bh-1', author_user_id: 'user-caretaker-1', category: 'Payment', title: 'October Rent Reminder', description: 'October rent is due on October 5, 2026. Please settle your balances on time to avoid late fees.', created_at: 'Sep 15, 2026' },
    { id: 'ann-2', house_id: 'bh-1', author_user_id: 'user-caretaker-1', category: 'Maintenance', title: 'Water Interruption Notice', description: 'Water supply will be interrupted on Sep 18 from 8AM–12PM for pipe maintenance. Store water in advance.', created_at: 'Sep 14, 2026' },
    { id: 'ann-3', house_id: 'bh-1', author_user_id: 'user-owner-1', category: 'House Rules', title: 'Curfew Reminder', description: 'Please be reminded that curfew is strictly at 10PM. Gates will be locked promptly after.', created_at: 'Sep 10, 2026' },
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
 * Seeds all 11 collections into Firestore when a live Firebase project is connected.
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
  console.log('✅ Successfully seeded all 11 3NF collections to Firestore!');
  return true;
}

