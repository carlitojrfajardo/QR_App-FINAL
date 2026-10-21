# Admin Setup — One Administrator Only

The app now enforces these rules **in PostgreSQL**, not just in the UI:

- New sign-ups always become **students**.
- Only an existing **admin** can change another user's role.
- There can be at most **one admin**.
- The only admin cannot demote themselves.
- Admin accounts are read-only in the Dashboard (only Student/Teacher can be assigned there).

Because the rules live in the database, calling the Supabase REST API directly
with a normal user token cannot bypass them.

---

## 1. Apply the database rules

Open **Supabase Dashboard → SQL Editor**, paste the whole `schema.sql`, and run it.

The guard trigger and the single-admin index are created at the end of the file.
If the project already has more than one admin, the index is skipped with a
notice — see step 2 before re-running.

## 2. Keep only one admin

If you already have multiple admins, demote all but one (edit the email):

```sql
-- The one you want to keep:
update public.profiles
set role = 'admin'
where email = 'admin@school.edu';

-- Everyone else:
update public.profiles
set role = 'student'
where role = 'admin'
  and email <> 'admin@school.edu';
```

Then re-run `schema.sql` so `profiles_one_admin_idx` is created.

Verify:

```sql
select email, role from public.profiles where role = 'admin';
-- must return exactly 1 row

select indexname from pg_indexes
where tablename = 'profiles' and indexname = 'profiles_one_admin_idx';
-- must return 1 row
```

## 3. Create the admin account (once)

Do this from the Supabase Dashboard, **not** from the mobile app:

1. **Authentication → Users → Add user**
2. Enter the admin email and a strong password.
3. Set the role:

```sql
update public.profiles
set role = 'admin'
where email = 'admin@school.edu';
```

The SQL Editor has no JWT, so the guard trigger allows this one-time setup.

> If email confirmation is enabled, confirm the user from the Dashboard first
> so the profile row exists.

## 4. Promote teachers

In the app, sign in as the admin → **Dashboard → User management** →
press **Teacher** on the account. Student/Teacher are the only assignable
roles; the admin row is read-only.

## 5. Transfer the admin later

Use the SQL Editor (not the app) in this order because of the unique index:

```sql
-- 1) demote the current admin
update public.profiles
set role = 'student'
where email = 'old-admin@school.edu';

-- 2) promote the new admin
update public.profiles
set role = 'admin'
where email = 'new-admin@school.edu';
```

## What the database rejects

| Attempt | Result |
| --- | --- |
| Student updates own `role` to `student`/`teacher` | `Only an admin can change roles` |
| Student inserts own profile with `role = 'admin'` | Blocked by RLS insert policy |
| Admin promotes another account to `admin` | `Only one admin account is allowed` |
| Admin demotes themselves | `You cannot remove your own admin role` |
| Admin demotes the only admin | `Cannot demote the only admin` |
| Normal user calls Supabase REST directly to change roles | Same errors above |

## Admin app experience

Admins don't check in, so the scanner is removed for them:

- The **Scan tab** is hidden from the bottom tab bar.
- Home shows **Open Dashboard** instead of **Scan QR Code**.
- Opening `/scan` directly (deep link / old navigation state) redirects to Home.
- Students and teachers still see the normal scanner.

## Notes

- `app/register.tsx` no longer has a role picker — signup creates a student.
- `lib/profiles.ts` exposes `AssignableRole = 'student' | 'teacher'` so the
  Dashboard cannot even build an `admin` assignment.
- The single-admin uniqueness is enforced by `profiles_one_admin_idx`
  (a partial unique index on `role` where `role = 'admin'`).
- For defense: this is defense-in-depth — UI restriction **plus** database
  authorization. Mention that the database is the final authority.
