-- ============================================================
-- Phase 3 — Supabase PostgreSQL Schema for QR-ATT
--
-- This file replaces the local SQLite schema with a cloud schema.
-- It mirrors the original `events` and `attendance` tables but
-- integrates with Supabase Auth (auth.users) and adds Row Level
-- Security so each user can only see their own data.
--
-- HOW TO RUN:
--   1. Open Supabase Dashboard -> SQL Editor
--   2. Paste the ENTIRE file
--   3. Click "Run"
--   4. Verify the tables appear under Table Editor
--
-- This script is IDEMPOTENT: it can be run multiple times safely.
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- Stored per-user profile that references Supabase Auth.
-- Created automatically for each new signed-up user.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade path: kung daan nga DB naay old CHECK (student/teacher lang),
-- ilisan ug bag-o nga mu-allow ug admin.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('student', 'teacher', 'admin'));
  end if;
end
$$;

alter table public.profiles enable row level security;

-- Profiles policies
drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Teachers can read the profiles of students who attended their events
-- (needed to show attendee names in the teacher's History view).
-- NOTE: created AFTER attendance table (see bottom of file) to avoid 42P01 error.

-- Automatically create a profile after a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. EVENTS TABLE
-- Represents an attendance event (mirrors SQLite `events`).
-- `event_code` is the public identifier embedded in the QR code.
-- ------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  title text not null,
  start_time timestamptz,
  end_time timestamptz,
  venue text,
  description text,
  status text not null default 'open' check (status in ('open', 'closed')),
  qr_token text,
  qr_expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Upgrade path para sa daan nga events table (walay bag-ong columns).
alter table public.events add column if not exists venue text;
alter table public.events add column if not exists description text;
alter table public.events add column if not exists status text not null default 'open';
alter table public.events add column if not exists qr_token text;
alter table public.events add column if not exists qr_expires_at timestamptz;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'events_status_check'
      and conrelid = 'public.events'::regclass
  ) then
    -- naa na, ayaw na hilabti
    null;
  else
    alter table public.events
      add constraint events_status_check
      check (status in ('open', 'closed'));
  end if;
end
$$;

alter table public.events enable row level security;

-- Helper sayo pa lang (kinahanglan sa insert policy sa ubos).
-- Tinuod kung ang naka-login kay admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Events policies
-- Any signed-in user can read event details (needed to validate QR codes)
drop policy if exists "Events are readable by any authenticated user" on public.events;
create policy "Events are readable by any authenticated user"
  on public.events for select
  using (auth.role() = 'authenticated');

-- PDF role-based authorization: Teacher ug Admin ra pwede mag-create ug events.
-- Student blocked sa DB level (dili lang sa UI).
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Teachers and admins can insert events" on public.events;
create policy "Teachers and admins can insert events"
  on public.events for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'admin')
    )
  );

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
  on public.events for update
  using (auth.uid() = created_by);

-- ------------------------------------------------------------
-- 3. ATTENDANCE TABLE
-- Records one student scanning one event.
-- `student_id` references the auth user, `event_id` references events.
-- Mirrors SQLite `attendance` table and its UNIQUE constraint.
-- ------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_at timestamptz not null default now(),
  status text not null default 'present' check (status in ('present', 'late')),
  unique (student_id, event_id)
);

-- Upgrade path para sa daan nga attendance table.
alter table public.attendance add column if not exists status text not null default 'present';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'attendance_status_check'
      and conrelid = 'public.attendance'::regclass
  ) then
    alter table public.attendance
      add constraint attendance_status_check
      check (status in ('present', 'late'));
  end if;
end
$$;

alter table public.attendance enable row level security;

-- Attendance policies
-- Students can only view / insert their own attendance
drop policy if exists "Students can view their own attendance" on public.attendance;
create policy "Students can view their own attendance"
  on public.attendance for select
  using (auth.uid() = student_id);

drop policy if exists "Students can insert their own attendance" on public.attendance;
create policy "Students can insert their own attendance"
  on public.attendance for insert
  with check (auth.uid() = student_id);

-- Teachers can view attendance for events they created
drop policy if exists "Teachers can view attendance for their events" on public.attendance;
create policy "Teachers can view attendance for their events"
  on public.attendance for select
  using (
    exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and e.created_by = auth.uid()
    )
  );

-- Teachers can read profiles of students who attended their events
-- (must come AFTER attendance table exists, else 42P01 error)
drop policy if exists "Teachers can view profiles of their attendees" on public.profiles;
create policy "Teachers can view profiles of their attendees"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.attendance a
      join public.events e on e.id = a.event_id
      where a.student_id = profiles.id
        and e.created_by = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4. ADMIN POLICIES (Final Project requirement: Administrator role)
-- Admin = user nga ang profiles.role = 'admin'.
-- Kinahanglan i-run human sa tables para magamit sa policies.
-- ------------------------------------------------------------

-- Helper: tinuod kung ang naka-login kay admin.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: admin makakita ug maka-update sa tanan (para sa user management).
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- Events: admin makakita, makahimo, maka-edit/close sa tanang events.
drop policy if exists "Admins can view all events" on public.events;
create policy "Admins can view all events"
  on public.events for select
  using (public.is_admin());

drop policy if exists "Admins can update all events" on public.events;
create policy "Admins can update all events"
  on public.events for update
  using (public.is_admin());

drop policy if exists "Admins can delete events" on public.events;
create policy "Admins can delete events"
  on public.events for delete
  using (public.is_admin());

-- Attendance: admin makakita sa tanan + maka-correct/delete
-- (PDF requirement: Manage or correct attendance records).
drop policy if exists "Admins can view all attendance" on public.attendance;
create policy "Admins can view all attendance"
  on public.attendance for select
  using (public.is_admin());

drop policy if exists "Admins can update all attendance" on public.attendance;
create policy "Admins can update all attendance"
  on public.attendance for update
  using (public.is_admin());

drop policy if exists "Admins can delete attendance" on public.attendance;
create policy "Admins can delete attendance"
  on public.attendance for delete
  using (public.is_admin());

------------------------------------------------------------
-- END OF SCHEMA
------------------------------------------------------------
