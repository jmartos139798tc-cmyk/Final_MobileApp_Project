# Initial room and payment setup

The tenant's initial room choice and proof of one month advance plus one month
security deposit are stored in Supabase. Firebase remains the sign-in provider
and continues to hold the room catalog and the rest of the app's records.

## One-time Supabase setup

1. In the Supabase Dashboard, open **Authentication → Sign In / Providers → Third-Party Auth** and connect Firebase project `boardinghouse-rental-mgt`.
2. Make sure the base schema in `migrations/20261009161120_initial_schema.sql` has already been applied. Then run `migrations/20261010120000_supabase_initial_room_setup.sql` in the Supabase SQL Editor. It adds the setup fields, access policies, and private `initial-payment-proofs` bucket.
3. From the project root, run `node scripts/configure-firebase-supabase-claims.mjs <path-to-firebase-service-account.json>`. Use a Firebase Admin service account for the same Firebase project. The script assigns `role: authenticated` and adds `app_role` for existing owner, landlord, and caretaker accounts.
4. Have existing users sign out and sign in again to refresh their Firebase ID token. When new Firebase accounts are added later, run the claims script again for them.
5. Confirm `.env` has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, then restart Expo so it picks up the values.

Keep the service-account JSON private and do not add it to source control. Never
put the Supabase service-role key in the app; the app uses the publishable key
and the row/object policies in the migration.
