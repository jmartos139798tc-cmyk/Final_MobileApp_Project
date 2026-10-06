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
