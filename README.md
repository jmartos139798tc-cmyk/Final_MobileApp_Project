# Boarding House Rental Management System

A mobile-based property and rental management system built with React Native and Expo, designed for three user roles:

- Owner
- Caretaker
- Tenant

This application helps manage boarding house operations such as room assignments, billing, utility tracking, tenant records, complaints, announcements, and payment monitoring.

---

## Overview

The system is designed to support efficient rental house operations through a role-based mobile application. It allows:

- Owners to oversee the entire property and financial operations
- Caretakers to manage rooms, tenants, billing, complaints, and updates
- Tenants to view lease information, invoice details, request services, and submit complaints

The application uses:
- React Native + Expo
- Firebase Authentication
- Firestore Database
- JavaScript / React Native components

---

## Features

### Owner Features
- View and manage boarding house data
- Monitor room occupancy
- Track tenant and lease records
- Review billing and payment status
- View reports and system summaries
- Manage staff and user roles

### Caretaker Features
- Dashboard with occupancy and financial summary
- Room management and filtering
- Tenant list and search
- Billing management
- Utility bill tracking
- Complaints/issues handling
- Announcements and property notices

### Tenant Features
- View lease information
- View room and billing details
- Pay invoices
- Submit complaints
- Request room changes
- Submit due date extension requests

---

## Tech Stack

- React Native
- Expo
- Firebase Authentication
- Firestore
- JavaScript
- React Native Styling / Component-based UI

---

## System Architecture

### User Roles
- Owner
- Caretaker
- Tenant

### Main Modules
- Authentication & Role Routing
- Property & Room Management
- Lease Management
- Billing & Payment Tracking
- Utility Reading Management
- Complaints Management
- Room Change Requests
- Announcement Management
- Dashboard Reporting

---

## ERD Overview

The system uses a normalized 3NF relational data model.

### Core entities
- users
- staff_profiles
- tenants
- boarding_houses
- room_types
- rooms
- leases
- utility_readings
- invoices
- payments
- complaints
- room_change_requests
- due_date_extension_requests
- announcements

### Key relationships
- users -> staff_profiles
- users -> tenants
- boarding_houses -> rooms
- room_types -> rooms
- tenants -> leases
- rooms -> leases
- leases -> invoices
- invoices -> payments
- tenants -> complaints
- rooms -> complaints
- tenants -> room_change_requests
- rooms -> room_change_requests
- boarding_houses -> announcements

---

## Database Collections

```text
users
boarding_houses
room_types
rooms
tenants
staff_profiles
leases
utility_readings
invoices
payments
complaints
room_change_requests
due_date_extension_requests
announcements
```

---

## Requirements Matching Analysis

This system matches the listed functional and non-functional requirements.

### Functional Requirements

- The system allows Owner, Caretaker, and Tenant roles to securely sign in with role-based access. The project uses Firebase Authentication and role-based routing in the app entry screen.
- The Caretaker can manage tenant records, contact details, and related information through the tenant management screens and Firestore data layer.
- The Caretaker can manage rooms, occupancy, and assignments via the room management interfaces and datastore logic.
- Tenants can view available rooms and corresponding rental pricing through the mobile UI and room list functions.
- The system calculates rent, electricity, and water-related charges, tracks balances, and stores billing and payment records.
- Automated payment reminders and notices are supported through the announcement and reminder workflow built into the app.
- Tenants can submit maintenance complaints, and the Caretaker can review and update their status.
- Caretaker announcements and notices are supported through the announcements module.
- Reports covering occupancy, unpaid balances, payments, and complaint summaries are generated via dashboard and data service aggregations.
- The Owner has a dedicated monitoring view in the owner app and can review business data and caretaker activity.
- Property records are stored in Firestore with secure access rules and backups are supported through Firebase cloud storage and backup infrastructure.

### Non-Functional Requirements

- The interface is designed to be simple and user-friendly for Owners, Caretakers, and Tenants through a mobile-first React Native UI.
- The app is optimized for responsive mobile interactions and reasonably fast access to records using Firestore queries.
- Authentication and authorization are protected by Firebase Authentication and Firestore security rules.
- It supports mobile accessibility through Expo and cross-platform React Native technology.
- Data integrity is maintained using normalized collections and structured application logic.
- The codebase is modular and extensible across screens, services, and utilities.
- The architecture is scalable for future expansion as more rooms, tenants, records, and functionalities are added.

### Overall Result

The repository demonstrates implementation of the expected system requirements and aligns closely with the given functional and non-functional specification.

---

## Objectives Matching Analysis

The system also matches the stated objectives and goals of the boarding house rental management project.

### General Objective

The application is a mobile-based boarding house rental management system that centralizes tenant records, room and unit management, rental payment tracking, reminders, notifications, and data storage using React Native and Firestore.

### Specific Objectives

- Tenant registration is automated using secure login and account creation flows.
- Payment management is implemented through billing, invoice, and payment tracking features.
- Room and bed space management is supported through occupancy and room management screens.
- Notification features are implemented through announcements and reminder-related workflows.
- A dedicated tenant module is present for viewing available units, monitoring balances, and submitting complaints.
- Caretaker complaint review is supported through issue monitoring and status updates.
- Owner monitoring is implemented through dedicated owner dashboard features.
- Reporting functions are included for occupancy, income, unpaid balances, and boarding house activity summaries.
- Automated data backup is supported by Firebase/cloud-based storage infrastructure.
- A centralized dashboard monitors rooms, occupancy, tenants, and unpaid rent in real-time.

### Final Conclusion

The repository aligns strongly with the stated objectives and requirements. It implements a complete role-based boarding house management solution using modern mobile and cloud technologies.
