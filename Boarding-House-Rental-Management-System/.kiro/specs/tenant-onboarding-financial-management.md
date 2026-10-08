# Tenant Onboarding & Financial Management

**Status:** Draft  
**Created:** October 9, 2026  
**Owner:** Development Team

---

## Overview

A complete tenant lifecycle management system that handles registration approval, room verification, lease creation with security deposits, invoice generation, payment tracking, and financial calculations for both landlords and tenants.

---

## Requirements

### User Stories

#### As a Tenant (After Registration)
1. I want to see my account status (pending/approved/rejected) immediately after registration
2. I want to be notified when my account is approved or rejected
3. I want to see my lease details including 1-month advance and 1-month deposit requirements
4. I want to view my current balance, payment history, and upcoming due dates
5. I want to see a breakdown of charges (rent, utilities, deposits)
6. I want to know where and how to make payments

#### As a Landlord
7. I want to see all pending tenant registrations in one place
8. I want to verify room availability before approving a tenant
9. I want to approve or reject tenant applications with optional notes
10. I want to automatically create leases with configurable deposit requirements when approving tenants
11. I want to generate invoices for approved tenants (initial: 2 months for advance + deposit)
12. I want to track each tenant's payment status and balance
13. I want to see financial summaries per tenant (total paid, balance, payment history)
14. I want to calculate and view tenant-specific metrics (on-time payments, outstanding balance)
15. I want to send payment reminders to tenants with outstanding balances

### Functional Requirements

#### FR-1: Tenant Registration Status System
- Extend TENANTS table with `account_status` field: 'pending' | 'approved' | 'rejected'
- Set default status to 'pending' on registration
- Display status badge in tenant profile

#### FR-2: Landlord Approval Dashboard
- Create "Pending Approvals" screen showing all pending tenant registrations
- Show tenant details: name, email, phone, registration date
- Provide "Approve" and "Reject" actions with optional notes
- Check room availability before approval

#### FR-3: Room Assignment & Verification
- Display available rooms with type, capacity, and base rent
- Prevent assignment to occupied or maintenance rooms
- Allow landlord to select room and customize monthly rent during approval
- Update room status to 'occupied' upon lease creation

#### FR-4: Lease Creation with Deposits
- Automatically create lease record when tenant is approved
- Capture: tenant_id, room_id, start_date, agreed_monthly_rent, due_day_of_month
- Default lease status: 'active'
- Store deposit policy (1 month advance + 1 month security deposit)

#### FR-5: Initial Invoice Generation
- Generate first invoice upon lease creation
- Initial invoice includes:
  - 1 month advance payment (rent_charge)
  - 1 month security deposit (new field: security_deposit)
  - Total: 2× agreed_monthly_rent
- Set due_date based on lease due_day_of_month
- Invoice status: 'unpaid'

#### FR-6: Tenant Financial Dashboard
- Display current balance (unpaid invoices)
- Show payment history with receipts
- List all invoices with status (paid/unpaid/partial)
- Show security deposit amount and status
- Display next payment due date and amount

#### FR-7: Landlord Tenant Financial Management
- Per-tenant financial view showing:
  - Total rent collected
  - Outstanding balance
  - Security deposit held
  - Payment history timeline
  - Invoice list with payment status
- Bulk actions: send reminders, generate reports

#### FR-8: Payment Recording
- Landlord can record payments against invoices
- Capture: amount_paid, payment_date, payment_method, reference_no
- Update invoice status automatically (unpaid → partial → paid)
- Support partial payments

#### FR-9: Balance Calculations
- Real-time balance = sum(unpaid invoice amounts) - sum(payments)
- Calculate per-tenant totals
- Calculate property-wide totals
- Track overdue amounts (past due_date)

#### FR-10: Notifications & Status Updates
- Notify tenant when account is approved/rejected (in-app announcement)
- Notify tenant when invoice is generated
- Notify tenant when payment is recorded
- Notify landlord of new registrations

### Non-Functional Requirements

#### NFR-1: Performance
- Approval action completes within 3 seconds
- Financial calculations refresh within 1 second
- Support up to 100 concurrent tenants

#### NFR-2: Data Integrity
- Prevent duplicate lease creation for same tenant
- Prevent approval of already-approved tenants
- Ensure room can only be assigned to one active tenant
- Maintain audit trail of status changes

#### NFR-3: Security
- Only landlord/owner roles can approve/reject tenants
- Only landlord/owner can record payments
- Tenants can only view their own financial data
- Firestore rules enforce role-based access

#### NFR-4: Usability
- Clear status indicators with color coding
- Intuitive approval workflow (3 clicks max)
- Mobile-responsive financial tables
- Export financial data as PDF/Excel

---

## Design

### Database Schema Updates

#### 1. Update TENANTS Collection
```javascript
TENANTS: {
  id: 'tenant-{uid}',
  user_id: '{firebase_auth_uid}',
  first_name: string,
  last_name: string,
  initials: string,
  phone: string,
  avatar_color: string,
  
  // NEW FIELDS
  account_status: 'pending' | 'approved' | 'rejected',
  approved_at: timestamp | null,
  approved_by: user_id | null,
  rejected_at: timestamp | null,
  rejection_reason: string | null,
  registered_at: timestamp,
}
```

#### 2. Update INVOICES Collection
```javascript
INVOICES: {
  id: 'invoice-{timestamp}',
  lease_id: string,
  billing_period: 'YYYY-MM',
  invoice_type: 'initial' | 'monthly' | 'final', // NEW
  
  // Charge Breakdown
  rent_charge: number,
  utility_charge: number,
  security_deposit: number, // NEW (only for initial invoices)
  other_charges: number, // NEW
  
  total_amount: number,
  due_date: 'MMM DD, YYYY',
  status: 'unpaid' | 'partial' | 'paid',
  created_at: timestamp,
  notes: string | null, // NEW
}
```

#### 3. Update LEASES Collection
```javascript
LEASES: {
  id: 'lease-{timestamp}',
  tenant_id: string,
  room_id: string,
  start_date: 'YYYY-MM-DD',
  end_date: 'YYYY-MM-DD' | null,
  agreed_monthly_rent: number,
  due_day_of_month: number (1-31),
  
  // NEW FIELDS
  security_deposit_amount: number,
  security_deposit_paid: boolean,
  
  status: 'active' | 'terminated',
}
```

#### 4. New Collection: TENANT_NOTIFICATIONS
```javascript
TENANT_NOTIFICATIONS: {
  id: 'notif-{timestamp}',
  tenant_id: string,
  type: 'approval' | 'rejection' | 'invoice_created' | 'payment_recorded',
  title: string,
  message: string,
  read: boolean,
  created_at: timestamp,
  related_invoice_id: string | null,
}
```

### User Interface Design

#### Screen 1: Landlord Pending Approvals Screen
**Location:** `app/screens/landlord/PendingApprovalsScreen.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  Pending Tenant Approvals      [Filter]│
│                                         │
│  ┌────────────────────────────────────┐│
│  │ [Avatar] Juan Dela Cruz            ││
│  │          juan@email.com            ││
│  │          09171234567               ││
│  │          Registered: Oct 8, 2026   ││
│  │                                    ││
│  │  [Reject] [View Details] [Approve]││
│  └────────────────────────────────────┘│
│                                         │
│  ┌────────────────────────────────────┐│
│  │ [Avatar] Maria Santos              ││
│  │          ...                       ││
│  └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Actions:**
- **Reject:** Opens modal with rejection reason textarea → Updates status to 'rejected'
- **View Details:** Shows full tenant info (email, phone, registration date)
- **Approve:** Opens approval modal with room selection

#### Screen 2: Approval Modal with Room Assignment
**Component:** `app/components/landlord/TenantApprovalModal.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  Approve Tenant: Juan Dela Cruz         │
│                                         │
│  Select Room *                          │
│  ┌────────────────────────────────────┐│
│  │ ○ Room 05 - Single - P2,500       ││
│  │ ● Room 07 - Double - P2,000       ││
│  │ ○ Room 12 - Single - P2,500       ││
│  └────────────────────────────────────┘│
│                                         │
│  Monthly Rent: [P2,000]                │
│  Due Day: [5]                          │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │ Initial Payment Summary          │ │
│  │                                  │ │
│  │ 1 Month Advance     P2,000      │ │
│  │ Security Deposit    P2,000      │ │
│  │ ─────────────────────────────── │ │
│  │ Total Due           P4,000      │ │
│  └──────────────────────────────────┘ │
│                                         │
│  [Cancel]           [Approve & Create] │
└─────────────────────────────────────────┘
```

**Logic:**
1. Fetch vacant rooms from database
2. Display room options with base rent
3. Allow rent override
4. Calculate initial payment (2× monthly rent)
5. On approve:
   - Update tenant.account_status = 'approved'
   - Create lease record
   - Create initial invoice
   - Update room.status = 'occupied'
   - Create notification for tenant

#### Screen 3: Tenant Financial Dashboard (Tenant-facing)
**Location:** `app/screens/tenant/TenantFinancialScreen.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  My Finances                            │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ Current Balance     [P4,000]    │  │
│  │ Status: UNPAID                   │  │
│  │ Due: Oct 15, 2026                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Payment Instructions                   │
│  • GCash: 09171234567 (Owner Name)     │
│  • Bank Transfer: BDO 1234567890       │
│  • Cash: Pay at office (Mon-Fri 9-5)  │
│                                         │
│  ────────────────────────────────────  │
│                                         │
│  Current Invoice (October 2026)         │
│  ┌──────────────────────────────────┐  │
│  │ Monthly Rent           P2,500    │  │
│  │ Electricity            P340      │  │
│  │ Security Deposit       P2,500    │  │
│  │ ───────────────────────────────  │  │
│  │ Total                  P5,340    │  │
│  │                                  │  │
│  │ Paid                   P0        │  │
│  │ Balance                P5,340    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Payment History                        │
│  ┌────────────────────────────────────┐│
│  │ No payments yet                    ││
│  └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Features:**
- Real-time balance updates
- Payment instructions with copy buttons
- Invoice breakdown
- Payment history with receipt numbers
- Security deposit tracking

#### Screen 4: Landlord Tenant Financial Management
**Location:** `app/screens/landlord/TenantFinancialManagement.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  Tenant Financial Management    [Export]│
│                                         │
│  [All] [Paid] [Unpaid] [Overdue]       │
│                                         │
│  ┌────────────────────────────────────┐│
│  │ [JD] Juan Dela Cruz                ││
│  │      Room 07                       ││
│  │      Balance: P4,000 (OVERDUE)     ││
│  │      Last Payment: None            ││
│  │                                    ││
│  │  [Record Payment] [View Details]   ││
│  └────────────────────────────────────┘│
│                                         │
│  ┌────────────────────────────────────┐│
│  │ [MS] Maria Santos                  ││
│  │      Room 12                       ││
│  │      Balance: P0 (PAID)            ││
│  │      Last Payment: Oct 3, 2026     ││
│  │                                    ││
│  │  [Record Payment] [View Details]   ││
│  └────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Filters:**
- All: Show all tenants
- Paid: Balance = 0
- Unpaid: Balance > 0, not overdue
- Overdue: Balance > 0, past due date

#### Screen 5: Record Payment Modal
**Component:** `app/components/landlord/RecordPaymentModal.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  Record Payment - Juan Dela Cruz        │
│                                         │
│  Outstanding Balance: P4,000            │
│                                         │
│  Amount Paid * [P4,000]                │
│                                         │
│  Payment Date *                         │
│  [Oct 9, 2026] 📅                      │
│                                         │
│  Payment Method *                       │
│  ○ Cash                                 │
│  ● GCash                                │
│  ○ Bank Transfer                        │
│                                         │
│  Reference No. (Optional)               │
│  [GCash Ref: 123456789]                │
│                                         │
│  Notes (Optional)                       │
│  [Partial payment, remaining P1000...] │
│                                         │
│  [Cancel]           [Record Payment]   │
└─────────────────────────────────────────┘
```

**Validation:**
- Amount must be > 0
- Amount can exceed balance (for advance payments)
- Payment date cannot be in future
- Payment method required

#### Screen 6: Tenant Detail Financial View
**Location:** `app/screens/landlord/TenantDetailFinancial.js`

**Layout:**
```
┌─────────────────────────────────────────┐
│  ← Juan Dela Cruz                       │
│     Room 07 - Double Occupancy          │
│                                         │
│  Financial Summary                      │
│  ┌──────────────────────────────────┐  │
│  │ Total Collected     P12,340     │  │
│  │ Outstanding         P2,000      │  │
│  │ Security Deposit    P2,500      │  │
│  │ Lease Start         Sep 1, 2026 │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ────────────────────────────────────  │
│                                         │
│  Invoices                               │
│  ┌────────────────────────────────────┐│
│  │ October 2026         [UNPAID]      ││
│  │ Due: Oct 5           P2,840        ││
│  │ [View] [Record Payment]            ││
│  ├────────────────────────────────────┤│
│  │ September 2026       [PAID]        ││
│  │ Paid: Sep 3          P2,500        ││
│  │ [View Receipt]                     ││
│  ├────────────────────────────────────┤│
│  │ Initial Payment      [PAID]        ││
│  │ Paid: Sep 1          P5,000        ││
│  │ [View Receipt]                     ││
│  └────────────────────────────────────┘│
│                                         │
│  Payment History                        │
│  ┌────────────────────────────────────┐│
│  │ Oct 3, 2026   GCash    P2,500     ││
│  │ Sep 15, 2026  Cash     P2,500     ││
│  │ Sep 1, 2026   GCash    P5,000     ││
│  └────────────────────────────────────┘│
│                                         │
│  [Export PDF]  [Send Reminder]         │
└─────────────────────────────────────────┘
```

### Data Flow Diagrams

#### Flow 1: Tenant Registration → Approval
```
Tenant                  System                  Landlord
  |                        |                        |
  |--Register Account----->|                        |
  |                        |--Create User--------->|
  |                        |--Create Tenant------->|
  |                        |  (status: pending)    |
  |                        |                        |
  |<--Show "Pending"-------|                        |
  |                        |                        |
  |                        |<--View Pending List----|
  |                        |                        |
  |                        |<--Approve + Assign-----|
  |                        |                        |
  |                        |--Create Lease-------->|
  |                        |--Create Invoice------>|
  |                        |--Update Room--------->|
  |                        |--Send Notification--->|
  |                        |                        |
  |<--Notification---------|                        |
  |<--Show Dashboard-------|                        |
```

#### Flow 2: Payment Recording
```
Landlord                System                  Tenant
  |                        |                        |
  |--Record Payment------->|                        |
  |  (amount, method)      |                        |
  |                        |--Create Payment------->|
  |                        |--Update Invoice------->|
  |                        |  (recalc status)       |
  |                        |--Send Notification---->|
  |                        |                        |
  |<--Confirmation---------|                        |
  |                        |                        |
  |                        |                   <----|View Balance
  |                        |------Updated Balance--->|
```

### API Functions (dataService.js)

#### New Functions to Implement

```javascript
// 1. Get all pending tenant registrations
export async function getPendingTenantRegistrations()

// 2. Approve tenant and create lease
export async function approveTenant({ 
  tenantId, 
  roomId, 
  monthlyRent, 
  dueDay, 
  approvedBy 
})

// 3. Reject tenant application
export async function rejectTenant({ 
  tenantId, 
  rejectionReason, 
  rejectedBy 
})

// 4. Get tenant financial summary
export async function getTenantFinancialSummary(tenantId)

// 5. Record payment against invoice
export async function recordPayment({ 
  invoiceId, 
  amountPaid, 
  paymentDate, 
  paymentMethod, 
  referenceNo, 
  receivedBy,
  notes 
})

// 6. Get tenant payment history
export async function getTenantPaymentHistory(tenantId)

// 7. Get all tenants with financial status
export async function getTenantsWithFinancialStatus(filter)
// filter: 'all' | 'paid' | 'unpaid' | 'overdue'

// 8. Calculate tenant balance
export async function calculateTenantBalance(tenantId)

// 9. Get tenant notifications
export async function getTenantNotifications(tenantId)

// 10. Mark notification as read
export async function markNotificationAsRead(notificationId)

// 11. Generate monthly invoice for tenant
export async function generateMonthlyInvoice({ 
  tenantId, 
  billingPeriod, 
  utilityCharge 
})

// 12. Get invoice details with payments
export async function getInvoiceWithPayments(invoiceId)
```

---

## Tasks

### Phase 1: Database & Schema Updates (Foundation)

#### Task 1.1: Update Database Schema
- [ ] Add `account_status`, `approved_at`, `approved_by`, `rejected_at`, `rejection_reason`, `registered_at` to TENANTS collection
- [ ] Add `invoice_type`, `security_deposit`, `other_charges`, `notes` to INVOICES collection
- [ ] Add `security_deposit_amount`, `security_deposit_paid` to LEASES collection
- [ ] Create TENANT_NOTIFICATIONS collection structure
- [ ] Update databaseSchema.js with new fields and collection

**Acceptance Criteria:**
- All new fields documented in databaseSchema.js
- 3NF compliance verified
- No breaking changes to existing data

#### Task 1.2: Update Firestore Security Rules
- [ ] Add rules for TENANT_NOTIFICATIONS collection
- [ ] Restrict tenant approval actions to landlord/owner roles
- [ ] Restrict payment recording to landlord/owner roles
- [ ] Allow tenants read-only access to their own notifications
- [ ] Test rules with Firebase emulator

**Acceptance Criteria:**
- Tenants cannot approve themselves
- Tenants cannot record payments
- Tenants can only view own financial data
- Landlords can manage all tenant finances

#### Task 1.3: Update Seed Database
- [ ] Add sample pending tenants to seedDatabase.js
- [ ] Add sample notifications
- [ ] Add sample initial invoices with security deposits
- [ ] Update existing leases with security deposit fields

**Acceptance Criteria:**
- Demo mode shows 2-3 pending tenants
- Existing tenants have complete financial history
- Initial invoices show deposit breakdown

---

### Phase 2: Backend Services (Data Layer)

#### Task 2.1: Implement Tenant Approval Functions
- [ ] Implement `getPendingTenantRegistrations()`
- [ ] Implement `approveTenant()` with transaction:
  - Update tenant status
  - Create lease
  - Create initial invoice (with security deposit)
  - Update room status
  - Create approval notification
- [ ] Implement `rejectTenant()`
- [ ] Add error handling and validation

**Acceptance Criteria:**
- Approval creates lease, invoice, and updates room in one transaction
- Duplicate approvals prevented
- Room availability verified before approval
- Notifications created automatically

#### Task 2.2: Implement Financial Query Functions
- [ ] Implement `getTenantFinancialSummary()`
- [ ] Implement `getTenantsWithFinancialStatus(filter)`
- [ ] Implement `calculateTenantBalance()`
- [ ] Implement `getTenantPaymentHistory()`
- [ ] Implement `getInvoiceWithPayments()`
- [ ] Add efficient Firestore queries with proper indexes

**Acceptance Criteria:**
- Balance calculations accurate to the centavo
- Queries optimized (< 100ms for typical data)
- Handles tenants with no payments gracefully
- Filters work correctly (paid/unpaid/overdue)

#### Task 2.3: Implement Payment Recording
- [ ] Implement `recordPayment()` with validation:
  - Amount > 0
  - Payment date not in future
  - Invoice exists
  - Calculate and update invoice status
- [ ] Implement automatic invoice status updates
- [ ] Create payment notification
- [ ] Add receipt number generation

**Acceptance Criteria:**
- Partial payments supported
- Invoice status updates automatically (unpaid → partial → paid)
- Payment notification sent to tenant
- Idempotent (safe to retry)

#### Task 2.4: Implement Notification System
- [ ] Implement `getTenantNotifications()`
- [ ] Implement `markNotificationAsRead()`
- [ ] Implement `createNotification()` helper
- [ ] Add notification types: approval, rejection, invoice_created, payment_recorded

**Acceptance Criteria:**
- Notifications sorted by date (newest first)
- Read/unread status tracked
- Tenants only see their own notifications

#### Task 2.5: Update Registration Flow
- [ ] Modify `registerUser()` in authService.js to set `account_status: 'pending'`
- [ ] Set `registered_at` timestamp
- [ ] Create welcome notification after registration

**Acceptance Criteria:**
- New tenants start with 'pending' status
- Registration timestamp recorded
- Welcome notification created

---

### Phase 3: Landlord Screens (Management Interface)

#### Task 3.1: Create Pending Approvals Screen
**File:** `app/screens/landlord/PendingApprovalsScreen.js`
- [ ] Fetch and display pending tenants
- [ ] Show tenant cards with: avatar, name, email, phone, registration date
- [ ] Add "Approve" and "Reject" buttons
- [ ] Implement pull-to-refresh
- [ ] Add empty state ("No pending approvals")

**Acceptance Criteria:**
- Screen accessible from landlord navigation
- Real-time updates when approval status changes
- Mobile responsive layout
- Loading and error states handled

#### Task 3.2: Create Tenant Approval Modal
**File:** `app/components/landlord/TenantApprovalModal.js`
- [ ] Fetch and display vacant rooms
- [ ] Show room selection radio buttons with room type and base rent
- [ ] Input fields: monthly rent (editable), due day
- [ ] Display initial payment summary (advance + deposit)
- [ ] Implement approval action
- [ ] Show success/error feedback

**Acceptance Criteria:**
- Only vacant rooms shown
- Monthly rent pre-filled with base rent (editable)
- Payment summary updates when rent changes
- Modal closes on success
- Approval triggers all backend actions

#### Task 3.3: Create Rejection Modal
**File:** `app/components/landlord/TenantRejectionModal.js`
- [ ] Text area for rejection reason
- [ ] Confirm/cancel buttons
- [ ] Update tenant status on confirm

**Acceptance Criteria:**
- Reason required before rejecting
- Tenant notified after rejection
- Modal closes on success

#### Task 3.4: Create Tenant Financial Management Screen
**File:** `app/screens/landlord/TenantFinancialManagement.js`
- [ ] Fetch tenants with financial status
- [ ] Display tenant cards with: name, room, balance, last payment
- [ ] Filter tabs: All, Paid, Unpaid, Overdue
- [ ] "Record Payment" and "View Details" buttons
- [ ] Color-coded status badges
- [ ] Export functionality (bonus)

**Acceptance Criteria:**
- Filters work correctly
- Balance calculations accurate
- Overdue detection works (past due_date)
- Pull-to-refresh supported

#### Task 3.5: Create Record Payment Modal
**File:** `app/components/landlord/RecordPaymentModal.js`
- [ ] Display outstanding balance
- [ ] Input: amount paid (numeric), payment date (date picker), payment method (radio), reference number (optional), notes (optional)
- [ ] Validate inputs
- [ ] Call `recordPayment()` on submit
- [ ] Show success confirmation

**Acceptance Criteria:**
- Amount validation (> 0, reasonable)
- Date picker works on mobile
- Payment method required
- Success feedback clear
- Modal closes on success

#### Task 3.6: Create Tenant Detail Financial View
**File:** `app/screens/landlord/TenantDetailFinancial.js`
- [ ] Display tenant header: name, room, lease start
- [ ] Financial summary: total collected, outstanding, security deposit
- [ ] Invoice list with status badges
- [ ] Payment history timeline
- [ ] "View Invoice" and "Record Payment" actions
- [ ] Export PDF button (bonus)

**Acceptance Criteria:**
- All financial data accurate
- Invoices sorted by date (newest first)
- Payment history shows method and reference
- Navigation from tenant list works

#### Task 3.7: Add Navigation & Entry Points
- [ ] Add "Pending Approvals" to landlord bottom navigation
- [ ] Add "Tenant Finances" to landlord bottom navigation
- [ ] Add badge showing pending count on navigation icon
- [ ] Update LandlordApp.js navigation

**Acceptance Criteria:**
- Both screens accessible from nav bar
- Badge shows correct pending count
- Active tab highlighted

---

### Phase 4: Tenant Screens (Self-Service Interface)

#### Task 4.1: Create Tenant Financial Dashboard
**File:** `app/screens/tenant/TenantFinancialScreen.js`
- [ ] Display current balance with status badge
- [ ] Show due date
- [ ] Payment instructions section (GCash, bank, cash)
- [ ] Current invoice breakdown: rent, utilities, deposit, total
- [ ] Show paid amount and balance
- [ ] Payment history list
- [ ] Add "Request Extension" button (links to existing feature)

**Acceptance Criteria:**
- Balance accurate and real-time
- Payment instructions clear and copyable
- Invoice breakdown detailed
- Empty state for no payments
- Mobile responsive

#### Task 4.2: Update Tenant Home Screen
**File:** `app/screens/tenant/TenantHomeScreen.js`
- [ ] Add account status badge (pending/approved)
- [ ] Show onboarding message for pending accounts
- [ ] Display balance summary card
- [ ] Add quick action: "View Finances"

**Acceptance Criteria:**
- Pending status clearly shown
- Onboarding message friendly and informative
- Balance card links to financial screen
- UI adapts to account status

#### Task 4.3: Create Tenant Notification Center
**File:** `app/screens/tenant/TenantNotificationsScreen.js`
- [ ] Fetch and display notifications
- [ ] Group by date
- [ ] Mark as read on tap
- [ ] Notification icons based on type
- [ ] Link to related screens (e.g., invoice)

**Acceptance Criteria:**
- Unread notifications highlighted
- Chronological order (newest first)
- Tapping marks as read
- Deep links work (e.g., to invoice)

#### Task 4.4: Add Tenant Navigation
- [ ] Add "Finances" tab to tenant bottom navigation
- [ ] Add "Notifications" tab to tenant navigation
- [ ] Add notification badge (unread count)
- [ ] Update TenantApp.js navigation

**Acceptance Criteria:**
- Finances tab accessible
- Notifications tab shows badge with unread count
- Navigation smooth

---

### Phase 5: Testing & Refinement

#### Task 5.1: Unit Tests
- [ ] Test approval transaction (success, failure, duplicate)
- [ ] Test payment recording (full, partial, overpayment)
- [ ] Test balance calculations (multiple invoices, partial payments)
- [ ] Test notification creation
- [ ] Test status updates (pending → approved, invoice unpaid → paid)

**Acceptance Criteria:**
- All functions covered
- Edge cases tested
- Mock data comprehensive

#### Task 5.2: Integration Tests
- [ ] Test end-to-end approval flow
- [ ] Test payment recording → balance update → notification
- [ ] Test filter functionality
- [ ] Test navigation and deep links

**Acceptance Criteria:**
- Full user journeys work
- No data inconsistencies
- UI reflects backend state

#### Task 5.3: Manual Testing & QA
- [ ] Test on iOS simulator
- [ ] Test on Android emulator
- [ ] Test on physical device
- [ ] Test with Firebase (not just mock data)
- [ ] Test Firestore security rules
- [ ] Test error scenarios (network failure, permission denied)

**Acceptance Criteria:**
- No crashes
- Loading states smooth
- Error messages helpful
- Responsive on all screen sizes

#### Task 5.4: Performance Testing
- [ ] Test with 50+ tenants
- [ ] Test query performance
- [ ] Test balance calculation performance
- [ ] Optimize slow queries

**Acceptance Criteria:**
- Screens load within 2 seconds
- No UI lag when scrolling
- Firestore reads minimized

#### Task 5.5: Documentation
- [ ] Document API functions in dataService.js
- [ ] Add inline comments to approval logic
- [ ] Create README for financial management feature
- [ ] Document payment recording process
- [ ] Add troubleshooting guide

**Acceptance Criteria:**
- All functions documented
- Complex logic explained
- README complete

---

### Phase 6: Deployment & Rollout

#### Task 6.1: Database Migration
- [ ] Deploy Firestore rules to production
- [ ] Run migration script to add new fields to existing tenants
- [ ] Backfill `account_status` for existing tenants (set to 'approved')
- [ ] Backfill security deposit amounts for existing leases
- [ ] Verify data integrity

**Acceptance Criteria:**
- No data loss
- Existing tenants still functional
- New fields populated correctly

#### Task 6.2: Production Deployment
- [ ] Deploy to Expo production channel
- [ ] Monitor error logs
- [ ] Test on production Firebase
- [ ] Verify Firestore indexes created

**Acceptance Criteria:**
- App loads successfully
- No authentication errors
- Firestore queries fast

#### Task 6.3: User Training
- [ ] Create landlord training video (approval workflow)
- [ ] Create tenant onboarding guide
- [ ] Document payment instructions
- [ ] Provide FAQ

**Acceptance Criteria:**
- Training materials complete
- Easy to understand
- Covers common scenarios

---

## Success Metrics

### Functional Metrics
- ✅ Tenants can register and see pending status
- ✅ Landlords can approve/reject tenants
- ✅ Leases created automatically on approval
- ✅ Initial invoices include security deposit
- ✅ Tenants can view their balance and payment history
- ✅ Landlords can record payments
- ✅ Balance calculations accurate
- ✅ Notifications sent for key events

### Performance Metrics
- Approval completes in < 3 seconds
- Balance calculations refresh in < 1 second
- Screens load in < 2 seconds
- Support 100+ concurrent tenants

### User Satisfaction Metrics
- Landlords approve tenants in 3 clicks or less
- Tenants understand payment requirements clearly
- Zero data inconsistencies (balance mismatches)
- < 5% error rate during approval

---

## Risks & Mitigation

### Risk 1: Duplicate Approvals
**Impact:** High - Could create duplicate leases and invoices  
**Mitigation:**
- Check tenant status before approving
- Use Firestore transactions
- Add unique constraint on active lease per tenant

### Risk 2: Balance Calculation Errors
**Impact:** High - Financial discrepancies unacceptable  
**Mitigation:**
- Extensive unit tests for calculation logic
- Manual verification during QA
- Add audit log for all financial changes

### Risk 3: Payment Recording Mistakes
**Impact:** Medium - Could result in incorrect balances  
**Mitigation:**
- Require confirmation before recording
- Add "undo" functionality (within 24 hours)
- Log all payment actions with timestamp and user

### Risk 4: Firestore Security Rule Gaps
**Impact:** High - Could expose sensitive financial data  
**Mitigation:**
- Thorough security rule testing
- Use Firebase emulator for rule validation
- Regular security audits

### Risk 5: Notification Overload
**Impact:** Low - Too many notifications could annoy users  
**Mitigation:**
- Limit notifications to critical events only
- Add notification preferences
- Allow users to mute certain types

---

## Future Enhancements

### Phase 2 (After Initial Release)
1. **Automated Monthly Billing**
   - Cron job to generate monthly invoices
   - Include utility readings automatically
   - Send email/SMS reminders

2. **Payment Plans**
   - Allow tenants to request installment plans
   - Landlord approval workflow
   - Track installment compliance

3. **Refund Management**
   - Security deposit refunds on lease termination
   - Deduction tracking (damages, unpaid bills)
   - Refund approval workflow

4. **Financial Reports**
   - Export to Excel/PDF
   - Customizable date ranges
   - Revenue projections

5. **Online Payment Integration**
   - GCash API integration
   - PayMaya support
   - Automatic payment verification

6. **Late Fee Calculation**
   - Configurable late fee rules
   - Automatic application after due date
   - Grace period settings

7. **Tenant Credit Score**
   - Track on-time payment rate
   - Complaint history
   - Overall tenant rating

---

## Appendix

### A. Calculation Formulas

#### Initial Invoice Amount
```
initial_invoice_total = agreed_monthly_rent × 2
  where:
    rent_charge = agreed_monthly_rent (1 month advance)
    security_deposit = agreed_monthly_rent (1 month deposit)
    total_amount = rent_charge + security_deposit
```

#### Tenant Balance
```
tenant_balance = SUM(unpaid_invoice_amounts) - SUM(payment_amounts)
  where:
    unpaid_invoice_amounts = invoices.filter(status != 'paid').total_amount
    payment_amounts = payments.filter(invoice_id in tenant_invoices).amount_paid
```

#### Invoice Status
```
invoice_status = 
  if total_paid == 0 then 'unpaid'
  else if total_paid < total_amount then 'partial'
  else 'paid'
  
  where:
    total_paid = SUM(payments.filter(invoice_id == this_invoice).amount_paid)
```

#### Overdue Detection
```
is_overdue = (invoice.status != 'paid') AND (current_date > invoice.due_date)
```

### B. Status Definitions

**Tenant Account Status:**
- `pending`: Registered but awaiting landlord approval
- `approved`: Approved and has active lease
- `rejected`: Application rejected by landlord

**Invoice Status:**
- `unpaid`: No payments recorded
- `partial`: Some payment made but balance remains
- `paid`: Fully paid (balance = 0)

**Lease Status:**
- `active`: Currently occupying room
- `terminated`: Lease ended

**Room Status:**
- `vacant`: Available for assignment
- `occupied`: Has active tenant
- `maintenance`: Not available for assignment

### C. Notification Templates

**Approval Notification:**
```
Title: "Welcome! Your application was approved"
Message: "Your account has been approved. You've been assigned to Room {roomNumber}. 
Your initial payment of ₱{amount} (1 month advance + security deposit) is due on {dueDate}. 
View payment details in the Finances tab."
```

**Rejection Notification:**
```
Title: "Application Update"
Message: "Your application could not be approved at this time. Reason: {rejectionReason}. 
Please contact the property manager for more information."
```

**Invoice Created Notification:**
```
Title: "New Invoice: {billingPeriod}"
Message: "Your invoice for {billingPeriod} is ready. Amount: ₱{amount}. Due: {dueDate}. 
View details in the Finances tab."
```

**Payment Recorded Notification:**
```
Title: "Payment Received"
Message: "Your payment of ₱{amount} has been recorded. Receipt: {referenceNo}. 
Remaining balance: ₱{balance}."
```

---

**End of Specification**
