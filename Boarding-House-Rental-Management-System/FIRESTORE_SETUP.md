# Firebase accounts and Firestore schema

## Staff accounts

Owner and caretaker accounts use Firebase Authentication for email and password. Their
role and profile are stored separately in Firestore. Public sign-up remains tenant-only
so someone cannot choose an owner or caretaker role for themselves.

For each staff member:

1. In Firebase Console, enable **Authentication → Sign-in method → Email/Password**.
2. Add the staff member under **Authentication → Users → Add user**. Set a temporary
   password and have the staff member change it after signing in.
3. Copy the new account's UID. In Firestore, create `users/{UID}` with:
   `id: UID`, `email: staff email`, `role: owner` (or `caretaker`), and
   `created_at: ISO timestamp`.
4. Create `staff_profiles/{UID}` with `id: UID`, `user_id: UID`, `first_name`,
   `last_name`, and `phone`.

Sign-in checks the role in `users/{UID}`, then reads the associated staff profile and
opens the matching owner or caretaker app. Never store passwords in Firestore. The
`owner@bh.com` and `caretaker@bh.com` records in the sample data are demo records, not
working Authentication accounts.

## Normalized collections

Each document's Firestore document ID is its primary key. Fields ending in `_id` are
foreign keys; Firestore does not enforce those links, so writes must preserve them.

| Collection | Main fields and relationships |
| --- | --- |
| `users` | Firebase UID, email, role, created time |
| `staff_profiles` | One owner/caretaker profile per user UID |
| `tenants` | Tenant profile; optional `user_id` for tenants without app accounts |
| `boarding_houses` | Property name, address, electricity rate |
| `room_types` | Room category, base rent, capacity |
| `rooms` | House and room type foreign keys, room number, operational status, optional `reserved_for_name` for a prospective occupant while the room stays vacant |
| `leases` | Tenant and room foreign keys, dates, agreed rent |
| `utility_readings` | Room, billing period, meter readings, rate |
| `invoices` | Lease and billing period, charge amounts and due date; tenant is reached through the lease |
| `payments` | Invoice foreign key and payment details |
| `complaints` | Tenant and room foreign keys plus issue details |
| `room_change_requests` | Tenant, current room, and requested room foreign keys |
| `announcements` | House and author user foreign keys plus notice details |

Tenant personal details live in `tenants`; owner and caretaker details live in
`staff_profiles`. `users` keeps account identity and role. Passwords remain in Firebase
Authentication. The sample data no longer repeats tenant IDs on users or invoices, or
the derived room count on boarding houses.

## Existing Firestore data

Changing local seed data does not migrate a connected Firestore project. Before relying
on the normalized schema, back up the project and migrate existing records: create a
`staff_profiles/{UID}` document for each real owner/caretaker, move their names from
`users/{UID}` into that profile, remove `tenant_id` from user documents after confirming
the matching `tenants.user_id`, remove `tenant_id` from invoices after confirming the
linked lease, and remove `total_rooms` from boarding house documents. The app can still
read legacy tenant user documents during this transition.

Firestore Security Rules must limit role assignment to trusted administration and
prevent a signed-in user from changing their own role. The mobile client is not a
trusted place to administer staff privileges.

## Publish the Firestore rules

The repository includes `firestore.rules`. Publish it to the same Firebase project
used by `app/utils/firebase.js`; otherwise Firebase will continue to deny reads and
account registration writes. From this app directory, an installed Firebase CLI can
publish it with:

```sh
firebase deploy --only firestore:rules --project boardinghouse-rental-mgt
```

You can also copy `firestore.rules` into **Firestore Database → Rules** in Firebase
Console and click **Publish**. Publishing replaces the project's active rules, so
review any existing custom rules before replacing them. The included rules let staff
read/manage the property data, let tenants read their own tenant, lease, invoice,
payment, complaint, and request records, and allow public account creation only with
the `tenant` role.
