# Requirements Document

## Introduction

This document specifies the requirements for a comprehensive tenant onboarding and financial management system for a boarding house rental management application. The system enables landlords to manage pending tenant registrations, approve or reject applicants, assign rooms with custom lease terms, track deposits and advance payments, manage waitlists for occupied rooms, and maintain complete financial records per tenant. Tenants can view their financial status and submit payment proofs.

## Glossary

- **Tenant_Registration_System**: The subsystem that manages new tenant registration requests and their approval workflow
- **Room_Assignment_System**: The subsystem that verifies room availability and assigns rooms to approved tenants
- **Waitlist_System**: The subsystem that manages queues of tenants waiting for occupied rooms to become available
- **Lease_Management_System**: The subsystem that creates, stores, and manages lease agreements with custom rent amounts
- **Payment_Tracking_System**: The subsystem that tracks deposits, advance payments, monthly rent payments, and outstanding balances
- **Payment_Proof_System**: The subsystem that handles upload, storage, and verification of payment proof documents
- **Invoice_Generation_System**: The subsystem that creates monthly rent invoices for tenants
- **Financial_Dashboard**: The interface that displays financial status and transaction history
- **Landlord**: A user with administrative privileges who manages properties, approves tenants, and oversees financial operations
- **Tenant**: A user who rents a room and makes payments
- **Pending_Tenant**: A user who has registered but not yet been approved by the landlord
- **Approved_Tenant**: A tenant whose registration has been accepted and who has an active lease
- **Waitlisted_Tenant**: A tenant approved for a room that is currently occupied
- **Initial_Payment**: The combined deposit and advance payment (2 months rent) required before move-in
- **Deposit**: A refundable security payment equal to one month's rent
- **Advance_Payment**: A pre-payment for the first month's rent
- **Outstanding_Balance**: The total amount owed by a tenant including unpaid rent and fees
- **Payment_Proof**: Digital evidence (photo or document) of a payment transaction
- **Room**: A rentable unit within the boarding house
- **Occupied_Room**: A room that currently has an active tenant assigned
- **Available_Room**: A room with no active tenant assigned
- **Custom_Rent_Amount**: A rent price set specifically for a lease that may differ from the room's default price
- **Lease**: A rental agreement between landlord and tenant specifying terms, duration, and rent amount
- **Active_Lease**: A lease that is currently in effect
- **Monthly_Invoice**: A billing document generated for a specific month's rent

## Requirements

### Requirement 1: Tenant Registration Management

**User Story:** As a landlord, I want to view and manage pending tenant registrations, so that I can control who becomes a tenant in my boarding house

#### Acceptance Criteria

1. THE Tenant_Registration_System SHALL store all new tenant registrations with status "pending"
2. THE Tenant_Registration_System SHALL display pending registrations to the Landlord with applicant name, email, phone number, and registration date
3. WHEN the Landlord views pending registrations, THE Tenant_Registration_System SHALL provide options to approve or reject each application
4. WHEN the Landlord selects a pending registration, THE Tenant_Registration_System SHALL display full applicant details including contact information and submitted documents
5. THE Tenant_Registration_System SHALL sort pending registrations by registration date with newest first

### Requirement 2: Tenant Approval with Room Assignment

**User Story:** As a landlord, I want to approve tenant applications and assign them to specific rooms, so that I can manage room occupancy effectively

#### Acceptance Criteria

1. WHEN the Landlord approves a Pending_Tenant, THE Room_Assignment_System SHALL display a list of all rooms with their availability status
2. WHEN the Landlord selects a room for assignment, THE Room_Assignment_System SHALL verify the room is in "available" status
3. IF the selected room is in "occupied" status, THEN THE Waitlist_System SHALL offer to add the tenant to a waitlist for that room
4. WHEN the Landlord assigns an Available_Room to an Approved_Tenant, THE Room_Assignment_System SHALL update the room status to "occupied"
5. WHEN room assignment completes, THE Tenant_Registration_System SHALL update the tenant status from "pending" to "approved"
6. THE Room_Assignment_System SHALL prevent assignment of the same room to multiple active tenants simultaneously

### Requirement 3: Waitlist Management

**User Story:** As a landlord, I want to manage waitlists for occupied rooms, so that I can track demand and fill vacancies efficiently

#### Acceptance Criteria

1. WHEN the Landlord adds a tenant to a waitlist for an Occupied_Room, THE Waitlist_System SHALL store the tenant information with timestamp and room identifier
2. THE Waitlist_System SHALL display waitlisted tenants in first-come-first-served order per room
3. WHEN an Occupied_Room becomes available, THE Waitlist_System SHALL notify the Landlord of waitlisted tenants for that room
4. THE Waitlist_System SHALL allow the Landlord to assign the room to any tenant on the waitlist
5. WHEN a Waitlisted_Tenant is assigned a room, THE Waitlist_System SHALL remove that tenant from all waitlists
6. THE Waitlist_System SHALL allow the Landlord to remove a tenant from a waitlist
7. THE Waitlist_System SHALL display waitlist position number to each Waitlisted_Tenant for their requested room

### Requirement 4: Tenant Registration Rejection

**User Story:** As a landlord, I want to reject tenant applications with reasons, so that I can maintain control over who rents my rooms

#### Acceptance Criteria

1. WHEN the Landlord rejects a Pending_Tenant, THE Tenant_Registration_System SHALL update the registration status to "rejected"
2. WHEN a registration is rejected, THE Tenant_Registration_System SHALL record the rejection timestamp
3. THE Tenant_Registration_System SHALL allow the Landlord to provide an optional rejection reason
4. WHEN a registration is rejected, THE Tenant_Registration_System SHALL remove the registration from the pending list
5. THE Tenant_Registration_System SHALL maintain a record of rejected registrations for Landlord review

### Requirement 5: Lease Creation with Custom Rent

**User Story:** As a landlord, I want to create leases with custom rent amounts for each tenant, so that I can set individual pricing based on negotiations or circumstances

#### Acceptance Criteria

1. WHEN the Landlord approves a tenant and assigns a room, THE Lease_Management_System SHALL prompt for lease terms including rent amount, start date, and duration
2. THE Lease_Management_System SHALL allow the Landlord to enter a Custom_Rent_Amount that differs from the room's default rent
3. THE Lease_Management_System SHALL validate that the Custom_Rent_Amount is a positive numeric value
4. WHEN lease details are submitted, THE Lease_Management_System SHALL create an Active_Lease record linking the tenant, room, and financial terms
5. THE Lease_Management_System SHALL store the lease start date, end date, and monthly rent amount
6. THE Lease_Management_System SHALL calculate the Initial_Payment as two times the Custom_Rent_Amount
7. WHEN a lease is created, THE Lease_Management_System SHALL display the lease terms to the Landlord for confirmation

### Requirement 6: Initial Payment Calculation and Tracking

**User Story:** As a landlord, I want the system to automatically calculate initial payments (deposit plus advance), so that I can ensure proper upfront collection

#### Acceptance Criteria

1. WHEN an Active_Lease is created, THE Payment_Tracking_System SHALL calculate the Deposit as equal to one month's Custom_Rent_Amount
2. WHEN an Active_Lease is created, THE Payment_Tracking_System SHALL calculate the Advance_Payment as equal to one month's Custom_Rent_Amount
3. THE Payment_Tracking_System SHALL calculate the Initial_Payment as the sum of Deposit and Advance_Payment
4. THE Payment_Tracking_System SHALL display the Initial_Payment amount to both Landlord and Tenant
5. THE Payment_Tracking_System SHALL create a financial record for the tenant with Outstanding_Balance equal to Initial_Payment
6. THE Payment_Tracking_System SHALL separately track Deposit and Advance_Payment amounts in the tenant's financial record

### Requirement 7: Payment Proof Upload System

**User Story:** As a tenant, I want to upload proof of payment, so that the landlord can verify my payments and update my account

#### Acceptance Criteria

1. THE Payment_Proof_System SHALL allow the Tenant to upload image files or PDF documents as Payment_Proof
2. THE Payment_Proof_System SHALL validate uploaded files are in supported formats (JPEG, PNG, PDF)
3. THE Payment_Proof_System SHALL validate uploaded files do not exceed 10 megabytes
4. WHEN a Tenant uploads Payment_Proof, THE Payment_Proof_System SHALL store the file with metadata including upload timestamp, amount claimed, and payment date
5. THE Payment_Proof_System SHALL link each Payment_Proof to the specific tenant's account
6. THE Payment_Proof_System SHALL allow the Tenant to view their previously uploaded payment proofs
7. THE Payment_Proof_System SHALL display uploaded payment proofs to the Landlord for verification

### Requirement 8: Landlord Payment Verification and Recording

**User Story:** As a landlord, I want to review payment proofs and record verified payments, so that I can maintain accurate financial records

#### Acceptance Criteria

1. THE Payment_Proof_System SHALL display all pending Payment_Proof submissions to the Landlord
2. WHEN the Landlord views a Payment_Proof, THE Payment_Proof_System SHALL display the image or document alongside the claimed amount and payment date
3. THE Payment_Proof_System SHALL allow the Landlord to approve or reject each Payment_Proof
4. WHEN the Landlord approves a Payment_Proof, THE Payment_Tracking_System SHALL record the payment with the verified amount and date
5. WHEN a payment is recorded, THE Payment_Tracking_System SHALL reduce the tenant's Outstanding_Balance by the payment amount
6. WHEN the Landlord rejects a Payment_Proof, THE Payment_Proof_System SHALL allow entry of a rejection reason
7. THE Payment_Proof_System SHALL notify the Tenant when their Payment_Proof is approved or rejected

### Requirement 9: Tenant Financial Status View

**User Story:** As a tenant, I want to view my financial status and payment history, so that I can track my payments and outstanding balance

#### Acceptance Criteria

1. THE Financial_Dashboard SHALL display the Tenant's current Outstanding_Balance
2. THE Financial_Dashboard SHALL display the Tenant's Deposit amount and status (held or refunded)
3. THE Financial_Dashboard SHALL display the Tenant's monthly rent amount from their Active_Lease
4. THE Financial_Dashboard SHALL display a chronological list of all recorded payments with dates and amounts
5. THE Financial_Dashboard SHALL display the Tenant's next payment due date
6. THE Financial_Dashboard SHALL display pending Payment_Proof submissions with their verification status
7. THE Financial_Dashboard SHALL calculate and display total amount paid to date

### Requirement 10: Landlord Financial Management Per Tenant

**User Story:** As a landlord, I want to view and manage financial records for each tenant individually, so that I can track payments and balances effectively

#### Acceptance Criteria

1. THE Financial_Dashboard SHALL display a list of all Approved_Tenant accounts with their current Outstanding_Balance
2. WHEN the Landlord selects a tenant, THE Financial_Dashboard SHALL display complete financial details including Deposit, Advance_Payment, monthly rent, and payment history
3. THE Financial_Dashboard SHALL allow the Landlord to manually record a payment with amount, date, and payment method
4. WHEN the Landlord records a payment, THE Payment_Tracking_System SHALL update the Outstanding_Balance and store the transaction
5. THE Financial_Dashboard SHALL allow the Landlord to add additional charges to a tenant's account with description and amount
6. WHEN additional charges are added, THE Payment_Tracking_System SHALL increase the Outstanding_Balance accordingly
7. THE Financial_Dashboard SHALL display total amount collected from each tenant
8. THE Financial_Dashboard SHALL calculate and display total outstanding balance across all tenants

### Requirement 11: Balance Calculations and Tracking

**User Story:** As a system, I want to automatically calculate and update tenant balances based on payments and charges, so that financial records remain accurate

#### Acceptance Criteria

1. THE Payment_Tracking_System SHALL maintain a running Outstanding_Balance for each Approved_Tenant
2. WHEN a payment is recorded, THE Payment_Tracking_System SHALL subtract the payment amount from Outstanding_Balance
3. WHEN a charge is added, THE Payment_Tracking_System SHALL add the charge amount to Outstanding_Balance
4. WHEN a Monthly_Invoice is generated, THE Payment_Tracking_System SHALL add the monthly rent amount to Outstanding_Balance
5. THE Payment_Tracking_System SHALL validate that Outstanding_Balance calculations are accurate to two decimal places
6. THE Payment_Tracking_System SHALL record each balance change with timestamp and reason
7. IF the Outstanding_Balance becomes negative, THEN THE Payment_Tracking_System SHALL treat it as a credit toward future payments

### Requirement 12: Monthly Invoice Generation

**User Story:** As a landlord, I want the system to automatically generate monthly rent invoices for all active tenants, so that billing is consistent and timely

#### Acceptance Criteria

1. THE Invoice_Generation_System SHALL generate a Monthly_Invoice for each Approved_Tenant with an Active_Lease on the first day of each month
2. THE Invoice_Generation_System SHALL include in each Monthly_Invoice the tenant name, room number, billing period, rent amount, and due date
3. THE Invoice_Generation_System SHALL set the invoice due date to 15 days from the invoice generation date
4. WHEN a Monthly_Invoice is generated, THE Payment_Tracking_System SHALL add the rent amount to the tenant's Outstanding_Balance
5. THE Invoice_Generation_System SHALL make each Monthly_Invoice viewable to both the Tenant and Landlord
6. THE Invoice_Generation_System SHALL include previous Outstanding_Balance and new total due on each Monthly_Invoice
7. THE Invoice_Generation_System SHALL store all generated invoices for historical record keeping
8. THE Invoice_Generation_System SHALL allow the Landlord to manually generate an invoice for a specific tenant at any time

### Requirement 13: Access and Permissions

**User Story:** As a landlord, I want approved tenants to access the system immediately after approval, so that they can view their lease and make initial payments

#### Acceptance Criteria

1. WHEN a Pending_Tenant status changes to "approved", THE Tenant_Registration_System SHALL grant the tenant access to the tenant portal
2. THE Tenant_Registration_System SHALL allow Approved_Tenant to log in and view their Active_Lease details immediately after approval
3. THE Tenant_Registration_System SHALL allow Approved_Tenant to upload Payment_Proof before making any payment
4. THE Tenant_Registration_System SHALL allow Approved_Tenant to view financial status before payment verification
5. THE Tenant_Registration_System SHALL restrict Pending_Tenant and Waitlisted_Tenant from accessing full tenant portal features
6. THE Tenant_Registration_System SHALL allow Pending_Tenant to view only their application status

### Requirement 14: Data Integrity and Validation

**User Story:** As a system, I want to validate all financial data entries, so that records remain accurate and prevent errors

#### Acceptance Criteria

1. THE Payment_Tracking_System SHALL validate that all monetary amounts are non-negative numeric values
2. THE Payment_Tracking_System SHALL validate that payment dates are not in the future
3. THE Lease_Management_System SHALL validate that lease start dates are not before the current date
4. THE Lease_Management_System SHALL validate that lease end dates are after lease start dates
5. THE Room_Assignment_System SHALL validate that a room exists before assignment
6. THE Payment_Proof_System SHALL validate file types before allowing upload
7. THE Payment_Tracking_System SHALL prevent deletion of payment records linked to verified Payment_Proof
