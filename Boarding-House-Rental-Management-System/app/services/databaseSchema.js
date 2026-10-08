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
  STAFF_PROFILES: 'staff_profiles',
  LEASES: 'leases',
  UTILITY_READINGS: 'utility_readings',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  PAYMENT_PROOFS: 'payment_proofs',
  ROOM_ASSIGNMENT_REQUESTS: 'room_assignment_requests',
  COMPLAINTS: 'complaints',
  ROOM_CHANGE_REQUESTS: 'room_change_requests',
  DUE_DATE_EXTENSION_REQUESTS: 'due_date_extension_requests',
  ANNOUNCEMENTS: 'announcements',
  TENANT_NOTIFICATIONS: 'tenant_notifications',
};

/**
 * 3NF Entity Relationship Specifications:
 * 
 * 1. USERS: Authentication & base authorization
 *    - PK: user_id
 *    - Fields: email, role ('owner'|'caretaker'|'tenant'), created_at
 *    - Authentication credentials remain in Firebase Authentication.
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
 *    - Fields: room_number ('01'..'17'), status ('occupied'|'vacant'|'maintenance'),
 *      reserved_for_name (optional; a prospective occupant shown while the room remains vacant)
 * 
 * 5. TENANTS: Tenant personal records (Independent of room assignment)
 *    - PK: tenant_id
 *    - FK: user_id -> USERS.user_id (nullable for offline tenants)
 *    - Fields: first_name, last_name, initials, phone, emergency_contact, avatar_color,
 *      account_status ('pending'|'approved'|'rejected'), approved_at, approved_by,
 *      rejected_at, rejection_reason, registered_at
 *
 * 6. STAFF_PROFILES: Owner/caretaker personal records
 *    - PK: user_id (also FK -> USERS.user_id)
 *    - Fields: first_name, last_name, phone
 * 
 * 7. LEASES: Room occupancy & tenancy agreement (Many-to-many over time)
 *    - PK: lease_id
 *    - FK: tenant_id -> TENANTS.tenant_id
 *    - FK: room_id -> ROOMS.room_id
 *    - Fields: start_date, end_date, agreed_monthly_rent, due_day_of_month, 
 *      security_deposit_amount, security_deposit_paid, status ('active'|'terminated')
 * 
 * 8. UTILITY_READINGS: Electricity consumption records per room
 *    - PK: reading_id
 *    - FK: room_id -> ROOMS.room_id
 *    - Fields: billing_period ('2026-09'), prev_kwh, curr_kwh, rate_per_kwh, reading_date
 * 
 * 9. INVOICES: Monthly billing statements per lease
 *    - PK: invoice_id
 *    - FK: lease_id -> LEASES.lease_id
 *    - Fields: billing_period ('2026-09'), invoice_type ('initial'|'monthly'|'final'),
 *      rent_charge, utility_charge, security_deposit, other_charges, 
 *      total_amount, due_date, status ('paid'|'unpaid'|'partial'), created_at, notes
 *    - Tenant is determined through lease_id -> LEASES.tenant_id; do not duplicate tenant_id here.
 * 
 * 10. PAYMENTS: Financial transactions settling invoices
 *    - PK: payment_id
 *    - FK: invoice_id -> INVOICES.invoice_id
 *    - Fields: amount_paid, payment_date, payment_method ('cash'|'gcash'), reference_no, received_by_user_id
 * 
 * 11. COMPLAINTS: Issues filed by tenants
 *     - PK: complaint_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: room_id -> ROOMS.room_id
 *     - Fields: title, description, status ('pending'|'in-progress'|'resolved'), filed_at, resolved_at
 *
 * 12. ROOM_CHANGE_REQUESTS: Tenant requests to transfer to an available room
 *     - PK: request_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: current_room_id -> ROOMS.room_id
 *     - FK: requested_room_id -> ROOMS.room_id
 *     - Fields: reason, status ('pending'|'approved'|'declined'), requested_at
 * 
 * 13. DUE_DATE_EXTENSION_REQUESTS: Tenant requests to move an invoice due date
 *     - FK: tenant_id -> TENANTS.tenant_id; invoice_id -> INVOICES.invoice_id
 *     - Fields: current_due_date, requested_due_date, reason, status, requested_at
 *
 * 14. ANNOUNCEMENTS: Broadcast notices for the property
 *     - PK: announcement_id
 *     - FK: house_id -> BOARDING_HOUSES.house_id
 *     - FK: author_user_id -> USERS.user_id
 *     - Fields: category ('Payment'|'Maintenance'|'House Rules'), title, description, created_at
 *
 * 15. TENANT_NOTIFICATIONS: Personal notifications for tenants
 *     - PK: notification_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: related_invoice_id -> INVOICES.invoice_id (optional)
 *     - Fields: type ('approval'|'rejection'|'invoice_created'|'payment_recorded'),
 *       title, message, read, created_at
 *
 * 16. PAYMENT_PROOFS: Tenant-submitted payment proofs awaiting landlord verification
 *     - PK: proof_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: invoice_id -> INVOICES.invoice_id
 *     - Fields: amount, payment_date, payment_method ('cash'|'gcash'|'bank_transfer'),
 *       reference_no, proof_image_url, notes, status ('pending'|'approved'|'rejected'),
 *       submitted_at, reviewed_at, reviewed_by_user_id, rejection_reason
 *
 * 17. ROOM_ASSIGNMENT_REQUESTS: Tenant requests for initial room assignment after payment
 *     - PK: request_id
 *     - FK: tenant_id -> TENANTS.tenant_id
 *     - FK: requested_room_id -> ROOMS.room_id
 *     - Fields: status ('pending'|'approved'|'rejected'), requested_at,
 *       reviewed_at, reviewed_by_user_id, rejection_reason, notes
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
 * - USERS stores no tenant_id or personal name; those details belong to the matching
 *   tenant or staff profile. House room totals and invoice tenant IDs are derived
 *   through relationships and are not persisted as duplicate facts.
 */
