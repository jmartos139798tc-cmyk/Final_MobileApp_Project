/**
 * 3NF (Third Normal Form) Database Schema Definition
 * 
 * Normalization Rules Satisfied:
 * 1NF: Atomic values only, no repeating groups, unique primary keys.
 * 2NF: 1NF satisfied + all non-key attributes fully depend on primary key (no partial dependencies).
 * 3NF: 2NF satisfied + no transitive dependencies (no non-key attribute depends on another non-key attribute).
 */

export const COLLECTIONS = {
  USERS: 'users',
  BOARDING_HOUSES: 'boarding_houses',
  ROOM_TYPES: 'room_types',
  ROOMS: 'rooms',
  TENANTS: 'tenants',
  LEASES: 'leases',
  UTILITY_READINGS: 'utility_readings',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  COMPLAINTS: 'complaints',
  ROOM_CHANGE_REQUESTS: 'room_change_requests',
  ANNOUNCEMENTS: 'announcements',
};

/**
 * 3NF Entity Relationship Specifications:
 * 
 * 1. USERS: Authentication & base authorization
 *    - PK: user_id
 *    - Fields: email, role ('owner'|'caretaker'|'tenant'), created_at
 * 
 * 2. BOARDING_HOUSES: Property details
 *    - PK: house_id
 *    - Fields: name, address, default_kwh_rate
 * 
 * 3. ROOM_TYPES: Category & pricing defaults (Eliminates transitive dependency from rooms)
 *    - PK: type_id
 *    - Fields: name ('Single'|'Double'), base_rent, max_capacity
 * 
 * 4. ROOMS: Physical units
 *    - PK: room_id
 *    - FK: house_id -> BOARDING_HOUSES.house_id
 *    - FK: type_id -> ROOM_TYPES.type_id
 *    - Fields: room_number ('01'..'17'), status ('occupied'|'vacant'|'maintenance')
 * 
 * 5. TENANTS: Tenant personal records (Independent of room assignment)
 *    - PK: tenant_id
 *    - FK: user_id -> USERS.user_id (nullable for offline tenants)
 *    - Fields: first_name, last_name, initials, phone, emergency_contact, avatar_color
 * 
 * 6. LEASES: Room occupancy & tenancy agreement (Many-to-many over time)
 *    - PK: lease_id
 *    - FK: tenant_id -> TENANTS.tenant_id
 *    - FK: room_id -> ROOMS.room_id
 *    - Fields: start_date, end_date, agreed_monthly_rent, due_day_of_month, status ('active'|'terminated')
 * 
 * 7. UTILITY_READINGS: Electricity consumption records per room
 *    - PK: reading_id
 *    - FK: room_id -> ROOMS.room_id
 *    - Fields: billing_period ('2026-09'), prev_kwh, curr_kwh, rate_per_kwh, reading_date
 * 
 * 8. INVOICES: Monthly billing statements per lease
 *    - PK: invoice_id
 *    - FK: lease_id -> LEASES.lease_id
 *    - FK: tenant_id -> TENANTS.tenant_id
 *    - Fields: billing_period ('2026-09'), rent_charge, utility_charge, total_amount, due_date, status ('paid'|'unpaid'|'partial')
 * 
 * 9. PAYMENTS: Financial transactions settling invoices
 *    - PK: payment_id
 *    - FK: invoice_id -> INVOICES.invoice_id
 *    - Fields: amount_paid, payment_date, payment_method ('cash'|'gcash'), reference_no, received_by_user_id
 * 
 * 10. COMPLAINTS: Issues filed by tenants
 *     - PK: complaint_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: room_id -> ROOMS.room_id
 *     - Fields: title, description, status ('pending'|'in-progress'|'resolved'), filed_at, resolved_at
 *
 * 11. ROOM_CHANGE_REQUESTS: Tenant requests to transfer to an available room
 *     - PK: request_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: current_room_id -> ROOMS.room_id
 *     - FK: requested_room_id -> ROOMS.room_id
 *     - Fields: reason, status ('pending'|'approved'|'declined'), requested_at
 * 
 * 12. ANNOUNCEMENTS: Broadcast notices for the property
 *     - PK: announcement_id
 *     - FK: house_id -> BOARDING_HOUSES.house_id
 *     - FK: author_user_id -> USERS.user_id
 *     - Fields: category ('Payment'|'Maintenance'|'House Rules'), title, description, created_at
 */

/**
 * Normalization Audit:
 * 
 * - Why separate ROOM_TYPES from ROOMS?
 *   If base_rent or capacity were stored directly in ROOMS, changing the base rent for Single rooms
 *   would require updating 12 rows. That is an UPDATE ANOMALY caused by a transitive dependency:
 *   room_number -> type -> base_rent. In 3NF, base_rent depends strictly on type_id.
 * 
 * - Why separate LEASES from TENANTS and ROOMS?
 *   If tenant_id was in ROOMS, or room_id was in TENANTS, a tenant moving to another room or
 *   moving out would overwrite or delete the historical records (DELETION / INSERTION ANOMALIES).
 *   A LEASE explicitly models the time-bounded relationship between a tenant and a room.
 * 
 * - Why separate INVOICES and PAYMENTS?
 *   Tenants can make partial payments (e.g. paying ₱2,340 now and ₱500 later). Storing payment
 *   directly in INVOICES violates 1NF (repeating groups) or creates update anomalies.
 */

