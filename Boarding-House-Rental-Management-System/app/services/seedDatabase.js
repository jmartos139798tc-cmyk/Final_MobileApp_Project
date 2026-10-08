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

  // 4. ROOMS (Empty - Owner will add rooms)
  [COLLECTIONS.ROOMS]: [],

  // 5. TENANTS (Empty - No tenants yet)
  [COLLECTIONS.TENANTS]: [],

  // 6. LEASES (Empty - No lease agreements yet)
  [COLLECTIONS.LEASES]: [],

  // 7. UTILITY_READINGS (Empty - No utility readings yet)
  [COLLECTIONS.UTILITY_READINGS]: [],

  // 8. INVOICES (Empty - No invoices yet)
  [COLLECTIONS.INVOICES]: [],

  // 9. PAYMENTS (Empty - No payments yet)
  [COLLECTIONS.PAYMENTS]: [],

  // 10. COMPLAINTS (Empty - No complaints yet)
  [COLLECTIONS.COMPLAINTS]: [],

  // 11. ROOM_CHANGE_REQUESTS (Empty - No room change requests yet)
  [COLLECTIONS.ROOM_CHANGE_REQUESTS]: [],

  [COLLECTIONS.DUE_DATE_EXTENSION_REQUESTS]: [],

  // 12. ANNOUNCEMENTS (Empty - No announcements yet)
  [COLLECTIONS.ANNOUNCEMENTS]: [],
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
