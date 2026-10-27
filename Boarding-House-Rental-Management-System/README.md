# Boarding House Rental Management System

A mobile and web application for managing boarding-house operations, built with React Native, Expo, and Supabase (Auth, Postgres, and Storage).

## 📁 Project Structure

```
boarding-house-rental-management-system/
├── app/                          # Application source code
│   ├── components/              # Reusable UI components
│   │   ├── auth/               # Authentication components
│   │   │   ├── AuthFormField.js
│   │   │   ├── AuthModeSelector.js
│   │   │   ├── AuthNotice.js
│   │   │   └── AuthPrimaryButton.js
│   │   ├── BottomNav.js         # Caretaker bottom navigation
│   │   ├── CaretakerHeader.js   # Caretaker header
│   │   ├── Logo.js              # App logo component
│   │   ├── OwnerBottomNav.js    # Owner bottom navigation
│   │   ├── OwnerHeader.js       # Owner header
│   │   ├── TenantBottomNav.js   # Tenant bottom navigation
│   │   └── TenantHeader.js      # Tenant header
│   │
│   ├── screens/                 # Application screens
│   │   ├── auth/               # Authentication screens
│   │   │   └── LoginScreen.js
│   │   ├── owner/              # Owner portal screens
│   │   │   ├── OwnerDashboard.js
│   │   │   ├── OwnerRooms.js
│   │   │   ├── OwnerTenants.js  # NEW: Tenant management
│   │   │   └── OwnerReports.js
│   │   ├── tenant/             # Tenant portal screens
│   │   │   ├── TenantHomeScreen.js
│   │   │   ├── TenantComplaintsScreen.js
│   │   │   ├── TenantRoomChangeScreen.js
│   │   │   └── TenantUpdatesScreen.js
│   │   ├── AnnouncementsScreen.js  # Caretaker announcements
│   │   ├── BillingScreen.js        # Caretaker billing
│   │   ├── CaretakerDashboard.js   # Caretaker dashboard
│   │   ├── IssuesScreen.js         # Caretaker issues
│   │   ├── RoomsScreen.js          # Caretaker rooms
│   │   └── TenantsScreen.js        # Caretaker tenants
│   │
│   ├── services/                # Business logic & data layer
│   │   ├── authService.js       # Authentication service
│   │   ├── dataService.js       # Data operations (36 functions)
│   │   ├── databaseSchema.js    # Database schema definitions
│   │   └── seedDatabase.js      # Database seeding
│   │
│   ├── utils/                   # Utility functions
│   │   ├── firebase.js          # Legacy Firebase configuration (not used by current data service)
│   │   ├── responsive.js        # Responsive design utilities
│   │   └── ThemeContext.js      # Theme management (light/dark)
│   │
│   ├── CaretakerApp.js          # Caretaker app container
│   ├── OwnerApp.js              # Owner app container
│   ├── TenantApp.js             # Tenant app container
│   ├── RoleSelector.js          # Role selection screen
│   └── index.js                 # App entry point
│
├── assets/                      # Static assets (images, fonts)
├── .gitignore                   # Git ignore rules
├── App.js                       # Root app component
├── app.json                     # Expo configuration
├── firebase.json                # Legacy Firebase configuration
├── firestore.rules              # Legacy Firestore security rules
├── FIRESTORE_SETUP.md           # Archived Firebase/Firestore guide
├── index.js                     # Expo entry point
├── metro.config.js              # Metro bundler configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 22.13+ and npm (required by Expo SDK 57)
- Supabase project

### Installation

1. **Clone the repository**
   ```bash
   cd d:\Final_MobileApp_Project\Boarding-House-Rental-Management-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase** (see [`supabase/SETUP.md`](supabase/SETUP.md))
   - Apply the SQL migrations in `supabase/migrations`
   - Configure Supabase email authentication
   - Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`

4. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

## 👥 User Roles

### Owner Portal
- Full system access
- Manage tenants (add, edit, delete, assign rooms)
- Manage rooms (add rooms)
- Create and terminate leases
- View financial reports
- Generate invoices
- Record payments

### Caretaker Portal
- Manage day-to-day operations
- View rooms and tenants
- Handle complaints (update status)
- Create announcements
- View billing information
- Manage room change requests

### Tenant Portal
- View personal dashboard
- Submit complaints
- Request room changes
- View announcements
- View billing information

## 🔐 Authentication

### Demo Accounts
Create staff accounts through the app, then provision their roles as described in [`supabase/SETUP.md`](supabase/SETUP.md):
- Owner: set the Supabase profile role to `landlord`
- Caretaker: set the Supabase profile role to `caretaker`
- Tenants: Self-register through the app

## 📊 Database Schema

The application uses a normalized relational database with collections including:

- `users` - User accounts and roles
- `staff_profiles` - Owner/Caretaker profiles
- `tenants` - Tenant information
- `boarding_houses` - Property details
- `room_types` - Room categories
- `rooms` - Physical units
- `leases` - Tenant-room assignments
- `utility_readings` - Electricity consumption
- `invoices` - Monthly billing
- `payments` - Payment records
- `complaints` - Issue tracking
- `room_change_requests` - Room transfer requests
- `announcements` - System notices

See [`supabase/SETUP.md`](supabase/SETUP.md) and `supabase/migrations/` for the active Postgres schema and row-level security policies. The Firestore files are legacy references and are not used by the current data service.

## 🎨 Features

### ✅ Implemented
- User authentication (login, register, password reset)
- Role-based access control
- Tenant management (CRUD operations)
- Room management (add, assign)
- Lease management (create, terminate)
- Complaint system (submit, update status)
- Announcements (create, view)
- Room change requests (submit, review)
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Supabase Realtime updates

### 🚧 In Progress
- Invoice generation interface
- Payment recording interface
- Utility meter reading entry

## 🛠️ Technologies

- **Frontend**: React Native, Expo SDK 57
- **Backend**: Supabase (Authentication, Postgres, Storage, Realtime)
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: React Native StyleSheet, Theme Context
- **Navigation**: Custom navigation system
- **Icons**: Expo Vector Icons (Ionicons)

## 📱 Platform Support

- ✅ iOS (via Expo Go)
- ✅ Android (via Expo Go)
- ✅ Web (via Expo Web)

## 🔧 Development

### Clear cache and restart
```bash
npx expo start --clear
```

### Apply Supabase migrations
```bash
npx supabase db push
```

### Project scripts
```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
npm test           # Run billing rule tests
npm run check:web  # Build/export the web app
npm run verify     # Run tests and the web build
```

## 📝 Documentation

- `supabase/SETUP.md` - Supabase project setup and migration instructions
- `supabase/migrations/` - Database schema and row-level security policies
- `firestore.rules` - Legacy Firestore rules; not used by the active app backend

## 🤝 Contributing

This is a team project. Follow these guidelines:
1. Never commit backup files (*.backup.*, *.bak)
2. Never commit build artifacts (dist/, .expo/)
3. Never commit environment files with secrets (.env)
4. Always test before committing
5. Follow the existing code structure

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check `supabase/SETUP.md` for database and authentication setup
2. Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env`
3. Confirm the Supabase migrations have been applied with `npx supabase db push`
4. Clear cache if needed: `npx expo start --clear`

---

**Last Updated**: October 2026
**Version**: 1.0.0 (Phase 1 Complete)
