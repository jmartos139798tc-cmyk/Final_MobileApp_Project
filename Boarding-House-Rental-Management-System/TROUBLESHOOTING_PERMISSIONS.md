# Firestore Permission Issues - Troubleshooting Guide

## Issue: "Missing or insufficient permissions" errors

### ? Rules are already deployed correctly

The Firestore rules have been updated to support:
- **landlord** role (new unified role)
- **owner** role (legacy, backward compatible)
- **caretaker** role (legacy, backward compatible)

### ?? Check Your User Accounts

The permission errors mean your user accounts in Firestore might not have the correct role assigned.

#### Step 1: Verify User Roles in Firebase Console

1. Go to: https://console.firebase.google.com/project/boardinghouse-rental-mgt/firestore
2. Open the **`users`** collection
3. Check each user document
4. Verify the **`role`** field is set to one of:
   - `landlord` (recommended for new unified role)
   - `owner` (works with backward compatibility)
   - `caretaker` (works with backward compatibility)
   - `tenant` (for tenant users)

#### Step 2: Fix Missing or Incorrect Roles

If a user has no role or wrong role:

1. Click on the user document in Firestore Console
2. Edit the `role` field
3. Set it to `landlord` (or `owner`/`caretaker` for legacy)
4. Save the document

#### Step 3: Create Staff Profile (if needed)

For landlord/owner/caretaker users, you may also need a document in **`staff_profiles`** collection:

1. Go to `staff_profiles` collection
2. Create a document with ID = the user's UID (from users collection)
3. Add fields:
   ```
   {
     "id": "user-uid-here",
     "first_name": "John",
     "last_name": "Doe",
     "phone": "0917-123-4567",
     "position": "Property Manager"
   }
   ```

### ?? Quick Fix Checklist

For each team member who can't access the app:

- [ ] User exists in Firebase Authentication
- [ ] User document exists in `users` collection with correct UID
- [ ] User document has `role` field set to `landlord`, `owner`, or `caretaker`
- [ ] User document in `staff_profiles` collection exists (optional but recommended)
- [ ] Firestore rules are deployed (already done ?)
- [ ] User has logged out and logged back in after role change

### ?? After Making Changes

1. User must **log out** of the app
2. User must **log back in**
3. App will re-fetch the role from Firestore
4. Permissions should now work

### ?? Still Having Issues?

Check the browser/app console for specific error messages:
- `FirebaseError: Missing or insufficient permissions` = Role not set correctly
- `auth/invalid-credential` = Wrong email/password
- `Could not load...` = Network issue or collection doesn't exist

### ?? Example User Document Structure

```json
// Document in users collection (ID = user UID)
{
  "id": "abc123xyz",
  "email": "manager@example.com",
  "role": "landlord",
  "created_at": "2026-10-08T10:00:00Z"
}
```

```json
// Document in staff_profiles collection (ID = user UID)
{
  "id": "abc123xyz",
  "first_name": "Maria",
  "last_name": "Santos",
  "phone": "0917-555-1234",
  "position": "Property Manager"
}
```

### ? Quick Test

To test if rules are working, try logging in with:
- A user that has `role: "landlord"` in Firestore
- The app should load the LandlordApp interface
- Dashboard should show without permission errors

---

**Last Updated:** October 8, 2026
**Firebase Project:** boardinghouse-rental-mgt
**Rules Version:** Landlord role consolidation (v2)
