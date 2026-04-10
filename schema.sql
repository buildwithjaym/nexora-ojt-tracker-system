-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;

-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- =========================================================
-- BATCHES
-- source of truth for required_hours
-- =========================================================
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),

  code text not null unique,              -- example: BSIT-2024
  name text not null,                     -- example: BSIT 2024
  course text not null,                   -- example: BSIT
  year_label text,                        -- optional display label
  required_hours integer not null check (required_hours > 0),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_batches_course
  on public.batches(course);

create index if not exists idx_batches_is_active
  on public.batches(is_active);

create index if not exists idx_batches_created_at
  on public.batches(created_at desc);

drop trigger if exists trg_batches_updated_at on public.batches;
create trigger trg_batches_updated_at
before update on public.batches
for each row
execute function public.set_updated_at();

-- =========================================================
-- STUDENTS
-- required_hours copied from selected batch
-- =========================================================
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),

  student_number text not null unique,

  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,

  sex text,
  age integer check (age is null or age >= 0),

  email text unique,
  phone text,

  batch_id uuid not null references public.batches(id) on delete restrict,
  required_hours integer not null check (required_hours > 0),
  completed_hours integer not null default 0 check (completed_hours >= 0),

  status text not null default 'active'
    check (status in ('active', 'completed', 'inactive', 'dropped')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_batch_id
  on public.students(batch_id);

create index if not exists idx_students_status
  on public.students(status);

create index if not exists idx_students_last_name
  on public.students(last_name);

create index if not exists idx_students_created_at
  on public.students(created_at desc);

create index if not exists idx_students_completed_hours
  on public.students(completed_hours desc);

create or replace function public.set_student_required_hours()
returns trigger
language plpgsql
as $$
begin
  select b.required_hours
  into new.required_hours
  from public.batches b
  where b.id = new.batch_id;

  if new.required_hours is null then
    raise exception 'Invalid batch_id: required_hours not found';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_student_required_hours on public.students;
create trigger trg_set_student_required_hours
before insert or update of batch_id
on public.students
for each row
execute function public.set_student_required_hours();

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

-- =========================================================
-- TEACHERS
-- =========================================================
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),

  employee_number text unique,

  first_name text not null,
  middle_name text,
  last_name text not null,
  suffix text,

  email text unique,
  phone text,
  department text,

  status text not null default 'active'
    check (status in ('active', 'inactive')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teachers_last_name
  on public.teachers(last_name);

create index if not exists idx_teachers_status
  on public.teachers(status);

create index if not exists idx_teachers_created_at
  on public.teachers(created_at desc);

drop trigger if exists trg_teachers_updated_at on public.teachers;
create trigger trg_teachers_updated_at
before update on public.teachers
for each row
execute function public.set_updated_at();

-- =========================================================
-- OFFICES
-- =========================================================
create table if not exists public.offices (
  id uuid primary key default gen_random_uuid(),

  name text not null unique,
  address text,
  contact_person text,
  contact_email text,
  contact_phone text,

  capacity integer check (capacity is null or capacity >= 0),

  status text not null default 'active'
    check (status in ('active', 'inactive')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_offices_status
  on public.offices(status);

create index if not exists idx_offices_created_at
  on public.offices(created_at desc);

drop trigger if exists trg_offices_updated_at on public.offices;
create trigger trg_offices_updated_at
before update on public.offices
for each row
execute function public.set_updated_at();

-- =========================================================
-- ASSIGNMENTS
-- one active/pending assignment per student
-- =========================================================
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  office_id uuid not null references public.offices(id) on delete restrict,

  start_date date,
  end_date date,

  assigned_hours integer check (assigned_hours is null or assigned_hours >= 0),

  status text not null default 'active'
    check (status in ('pending', 'active', 'completed', 'cancelled')),

  remarks text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_student_id
  on public.assignments(student_id);

create index if not exists idx_assignments_teacher_id
  on public.assignments(teacher_id);

create index if not exists idx_assignments_office_id
  on public.assignments(office_id);

create index if not exists idx_assignments_status
  on public.assignments(status);

create index if not exists idx_assignments_created_at
  on public.assignments(created_at desc);

create unique index if not exists uq_assignments_one_active_per_student
  on public.assignments(student_id)
  where status in ('pending', 'active');

drop trigger if exists trg_assignments_updated_at on public.assignments;
create trigger trg_assignments_updated_at
before update on public.assignments
for each row
execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.offices enable row level security;
alter table public.assignments enable row level security;

-- =========================================================
-- BATCHES POLICIES
-- =========================================================
drop policy if exists "Admins can view batches" on public.batches;
create policy "Admins can view batches"
on public.batches
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert batches" on public.batches;
create policy "Admins can insert batches"
on public.batches
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update batches" on public.batches;
create policy "Admins can update batches"
on public.batches
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete batches" on public.batches;
create policy "Admins can delete batches"
on public.batches
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- STUDENTS POLICIES
-- =========================================================
drop policy if exists "Admins can view students" on public.students;
create policy "Admins can view students"
on public.students
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert students" on public.students;
create policy "Admins can insert students"
on public.students
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update students" on public.students;
create policy "Admins can update students"
on public.students
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete students" on public.students;
create policy "Admins can delete students"
on public.students
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- TEACHERS POLICIES
-- =========================================================
drop policy if exists "Admins can view teachers" on public.teachers;
create policy "Admins can view teachers"
on public.teachers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert teachers" on public.teachers;
create policy "Admins can insert teachers"
on public.teachers
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update teachers" on public.teachers;
create policy "Admins can update teachers"
on public.teachers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete teachers" on public.teachers;
create policy "Admins can delete teachers"
on public.teachers
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- OFFICES POLICIES
-- =========================================================
drop policy if exists "Admins can view offices" on public.offices;
create policy "Admins can view offices"
on public.offices
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert offices" on public.offices;
create policy "Admins can insert offices"
on public.offices
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update offices" on public.offices;
create policy "Admins can update offices"
on public.offices
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete offices" on public.offices;
create policy "Admins can delete offices"
on public.offices
for delete
to authenticated
using (public.is_admin());

-- =========================================================
-- ASSIGNMENTS POLICIES
-- =========================================================
drop policy if exists "Admins can view assignments" on public.assignments;
create policy "Admins can view assignments"
on public.assignments
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert assignments" on public.assignments;
create policy "Admins can insert assignments"
on public.assignments
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update assignments" on public.assignments;
create policy "Admins can update assignments"
on public.assignments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can delete assignments" on public.assignments;
create policy "Admins can delete assignments"
on public.assignments
for delete
to authenticated
using (public.is_admin());

alter table public.students
add column if not exists profile_id uuid unique references public.profiles(id) on delete cascade;

create index if not exists idx_students_profile_id
on public.students(profile_id);

add column if not exists must_change_password boolean default true;

create policy "Users can view their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update profiles"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete profiles"
on public.profiles
for delete
to authenticated
using (public.is_admin());

alter table public.teachers
add column if not exists profile_id uuid unique references public.profiles(id) on delete cascade;

create index if not exists idx_teachers_profile_id
on public.teachers(profile_id);


create index if not exists idx_offices_status
on public.offices(status);

create index if not exists idx_offices_created_at
on public.offices(created_at desc);

create trigger trg_offices_updated_at
before update on public.offices
for each row
execute function public.set_updated_at();


drop policy if exists "Admins can view offices" on public.offices;
drop policy if exists "Admins can insert offices" on public.offices;
drop policy if exists "Admins can update offices" on public.offices;
drop policy if exists "Admins can delete offices" on public.offices;

create policy "Admins can view offices"
on public.offices
for select
to authenticated
using (public.is_admin());

create policy "Admins can insert offices"
on public.offices
for insert
to authenticated
with check (public.is_admin());

create policy "Admins can update offices"
on public.offices
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins can delete offices"
on public.offices
for delete
to authenticated
using (public.is_admin());


alter table public.offices
add column if not exists latitude double precision,
add column if not exists longitude double precision;

alter table public.offices
drop column if exists map_label;

create index if not exists idx_assignments_student_id
on public.assignments(student_id);

create index if not exists idx_assignments_teacher_id
on public.assignments(teacher_id);

create index if not exists idx_assignments_office_id
on public.assignments(office_id);

create index if not exists idx_assignments_status
on public.assignments(status);

create index if not exists idx_assignments_created_at
on public.assignments(created_at desc);

create unique index if not exists uq_assignments_one_active_per_student
on public.assignments(student_id)
where status in ('pending', 'active');