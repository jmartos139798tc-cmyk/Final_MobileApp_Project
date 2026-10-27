# Supabase Auth and database setup

The app now uses **Supabase Auth, Postgres, and Supabase Storage**. Firebase accounts are not imported. New users create new Supabase accounts, and signup creates a pending tenant profile automatically.

## 1. Apply the database migrations

From the app folder, link the Supabase CLI to the intended project and push the migrations in `supabase/migrations` in timestamp order. The new full-Supabase migration is `20261015120000_supabase_auth_and_full_app.sql`.

The latest migration enables Realtime for the app tables used by live notifications, announcements, approvals, billing, and tenant updates. Apply it to the same hosted project before expecting screens to update automatically.

```powershell
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Use a development Supabase project first. The migration updates the profile signup trigger and replaces Firebase-token access policies with Supabase-user policies.

## 2. Configure app credentials and email sign-in

In the Supabase Dashboard, enable **Authentication → Providers → Email**. Decide whether new users must confirm their email. Set the project Site URL and add allowed redirect URLs for password recovery: your deployed web app origin and `boardinghouse://auth/reset-password` for native builds. Set `EXPO_PUBLIC_SUPABASE_REDIRECT_URL` if your app uses a different callback URL.

If the project previously trusted Firebase under **Authentication → Sign In / Providers → Third-Party Auth**, remove that Firebase integration after the app cutover. Hosted Dashboard provider settings are separate from `supabase/config.toml`.

Set these Expo variables in `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

Use only the publishable key in the Expo app. Never put a Supabase secret or service-role key in an `EXPO_PUBLIC_` variable. Restart Expo after changing `.env`.

## 3. Create the first landlord

Create the landlord account through the app’s registration screen and confirm the email first if confirmation is enabled. Then run this once in **Supabase Dashboard → SQL Editor**, replacing the email and staff details:

```sql
do $$
declare
  landlord_id uuid;
begin
  select id into landlord_id
  from auth.users
  where lower(email) = lower('landlord@example.com');

  if landlord_id is null then
    raise exception 'Create and confirm the landlord account before running this SQL';
  end if;

  update public.profiles
  set role = 'landlord'
  where id = landlord_id;

  insert into public.staff_profiles (user_id, first_name, last_name, phone)
  values (landlord_id, 'Landlord', 'Name', '')
  on conflict (user_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone;

  -- The signup trigger initially made every account a pending tenant.
  delete from public.tenants
  where id = 'tenant-' || landlord_id::text
    and user_id = landlord_id
    and account_status = 'pending';
end;
$$;
```

Sign out and back in so the app reloads the landlord profile. Provision additional caretakers and landlords by creating their accounts, then setting their `profiles.role` and adding a matching `staff_profiles` row through trusted admin SQL.

## 4. Add your property and rooms

For a fresh project, review `supabase/seed.sql`, change the property name, address, electricity rate, monthly Wi-Fi charge, and rents to your actual values, then run it once in the SQL Editor. It adds one house, two room types, and five vacant starter rooms. The inserts do nothing to rows with those IDs that already exist. The Wi-Fi amount is stored in `boarding_houses.monthly_wifi_charge`; the app uses ₱100 if an older property row has no value. It applies to new initial invoices and newly generated invoices for the current billing period. Backdated bills and invoices already issued keep their stored totals. To change the fee later, update the property row in Supabase SQL Editor, for example:

```sql
update public.boarding_houses
set monthly_wifi_charge = 75
where id = 'bh-1';
```

After setup, use the landlord account to manage rooms and test tenant signup, approval, billing, receipt upload, and password recovery. A new native build is needed for the `boardinghouse` deep-link scheme to open the password-reset screen. Keep the Firebase project intact as a backup until the Supabase version is confirmed working.
