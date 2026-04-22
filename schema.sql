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

alter table offices
add column google_place_id text;

create policy "Teachers can view themselves"
on teachers
for select
to authenticated
using (
  profile_id = auth.uid()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;
create or replace function public.current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.teachers t
  where t.profile_id = auth.uid()
  limit 1
$$;

drop policy if exists "Teachers can view their own assignments" on public.assignments;

create policy "Teachers can view their own assignments"
on public.assignments
for select
to authenticated
using (teacher_id = public.current_teacher_id());

drop policy if exists "Teachers can view assigned students" on public.students;

create policy "Teachers can view assigned students"
on public.students
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    where a.student_id = students.id
      and a.teacher_id = public.current_teacher_id()
  )
);

drop policy if exists "Teachers can view batches of assigned students" on public.batches;

create policy "Teachers can view batches of assigned students"
on public.batches
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.assignments a on a.student_id = s.id
    where s.batch_id = batches.id
      and a.teacher_id = public.current_teacher_id()
  )
);

alter table offices
add column google_place_id text null;

drop policy if exists "Teachers can update themselves" on public.teachers;

create policy "Teachers can update themselves"
on public.teachers
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());


<------For students Part------->

alter table public.attendance_days enable row level security;
alter table public.attendance_events enable row level security;

create table public.attendance_days (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete restrict,

  attendance_date date not null,
  status text not null default 'open',

  am_in_at timestamptz null,
  am_out_at timestamptz null,
  pm_in_at timestamptz null,
  pm_out_at timestamptz null,

  am_in_photo_url text null,
  am_out_photo_url text null,
  pm_in_photo_url text null,
  pm_out_photo_url text null,

  am_in_latitude double precision null,
  am_in_longitude double precision null,
  am_in_accuracy_meters double precision null,
  am_in_distance_meters double precision null,

  am_out_latitude double precision null,
  am_out_longitude double precision null,
  am_out_accuracy_meters double precision null,
  am_out_distance_meters double precision null,

  pm_in_latitude double precision null,
  pm_in_longitude double precision null,
  pm_in_accuracy_meters double precision null,
  pm_in_distance_meters double precision null,

  pm_out_latitude double precision null,
  pm_out_longitude double precision null,
  pm_out_accuracy_meters double precision null,
  pm_out_distance_meters double precision null,

  am_activity_summary text null,
  pm_activity_summary text null,

  am_work_seconds integer not null default 0,
  pm_work_seconds integer not null default 0,
  total_work_seconds integer generated always as (am_work_seconds + pm_work_seconds) stored,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint attendance_days_status_check
    check (status in ('open', 'completed', 'invalid')),

  constraint attendance_days_unique_student_date
    unique (student_id, attendance_date),

  constraint attendance_days_am_order_check
    check (
      am_out_at is null
      or am_in_at is not null
    ),

  constraint attendance_days_pm_order_check
    check (
      pm_out_at is null
      or pm_in_at is not null
    ),

  constraint attendance_days_am_time_check
    check (
      am_in_at is null
      or am_out_at is null
      or am_out_at >= am_in_at
    ),

  constraint attendance_days_pm_time_check
    check (
      pm_in_at is null
      or pm_out_at is null
      or pm_out_at >= pm_in_at
    ),

  constraint attendance_days_am_work_seconds_check
    check (am_work_seconds >= 0),

  constraint attendance_days_pm_work_seconds_check
    check (pm_work_seconds >= 0)
);

create table public.attendance_events (
  id uuid primary key default gen_random_uuid(),

  attendance_day_id uuid not null references public.attendance_days(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  office_id uuid not null references public.offices(id) on delete restrict,

  attendance_date date not null,
  event_type text not null,
  event_at timestamptz not null default now(),

  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision null,
  distance_meters double precision not null,

  photo_url text null,
  activity_summary text null,

  device_info jsonb null,
  created_at timestamptz not null default now(),

  constraint attendance_events_type_check
    check (event_type in ('am_in', 'am_out', 'pm_in', 'pm_out')),

  constraint attendance_events_distance_check
    check (distance_meters >= 0)
);

create index idx_attendance_days_student_date
on public.attendance_days(student_id, attendance_date desc);

create index idx_attendance_days_assignment_date
on public.attendance_days(assignment_id, attendance_date desc);

create index idx_attendance_days_office_date
on public.attendance_days(office_id, attendance_date desc);

create index idx_attendance_days_status
on public.attendance_days(status);

create index idx_attendance_days_created_at
on public.attendance_days(created_at desc);

create index idx_attendance_events_day_id
on public.attendance_events(attendance_day_id);

create index idx_attendance_events_student_date
on public.attendance_events(student_id, attendance_date desc);

create index idx_attendance_events_assignment_date
on public.attendance_events(assignment_id, attendance_date desc);

create index idx_attendance_events_office_date
on public.attendance_events(office_id, attendance_date desc);

create index idx_attendance_events_type
on public.attendance_events(event_type);

create index idx_attendance_events_event_at
on public.attendance_events(event_at desc);

create trigger trg_attendance_days_updated_at
before update on public.attendance_days
for each row
execute function set_updated_at();

create policy "students_can_view_their_own_attendance_days"
on public.attendance_days
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.profiles p
      on p.id = s.profile_id
    where s.id = attendance_days.student_id
      and p.id = auth.uid()
      and p.role = 'student'
      and p.is_active = true
  )
);


create policy "students_can_view_their_own_attendance_events"
on public.attendance_events
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    join public.profiles p
      on p.id = s.profile_id
    where s.id = attendance_events.student_id
      and p.id = auth.uid()
      and p.role = 'student'
      and p.is_active = true
  )
);

<--- RLS FOR STUDENTS--->

alter table public.students enable row level security;
alter table public.batches enable row level security;
alter table public.assignments enable row level security;
alter table public.offices enable row level security;
alter table public.teachers enable row level security;

create policy "Students can view their own student record"
on public.students
for select
to authenticated
using (profile_id = auth.uid());

create policy "Students can view their own batch"
on public.batches
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.batch_id = batches.id
  )
);

create policy "Students can view their own assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.id = assignments.student_id
  )
);

create policy "Students can view their own office"
on public.offices
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.students s on s.id = a.student_id
    where s.profile_id = auth.uid()
      and a.office_id = offices.id
  )
);

create policy "Students can view their assigned teacher"
on public.teachers
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    join public.students s on s.id = a.student_id
    where s.profile_id = auth.uid()
      and a.teacher_id = teachers.id
  )
);

<----RECURSION ERROR FIX----->

drop policy if exists "Students can view their own assignments" on public.assignments;
drop policy if exists "Teachers can view their own assignments" on public.assignments;
drop policy if exists "Teachers can manage their own assignments" on public.assignments;
drop policy if exists "Teachers can view assigned students" on public.assignments;


create policy "Students can view their own assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.profile_id = auth.uid()
      and s.id = public.assignments.student_id
  )
);

create policy "Teachers can view their own assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.teachers t
    where t.profile_id = auth.uid()
      and t.id = public.assignments.teacher_id
  )
);


<---- RECURSION PROBLEM TO FIX IT----->
drop policy if exists "students_can_view_their_own_attendance_days" on public.attendance_days;
drop policy if exists "students_can_view_their_own_attendance_events" on public.attendance_events;

drop policy if exists "Students can view their own student record" on public.students;
drop policy if exists "Students can view their own batch" on public.batches;
drop policy if exists "Students can view their own assignments" on public.assignments;
drop policy if exists "Students can view their own office" on public.offices;
drop policy if exists "Students can view their assigned teacher" on public.teachers;

drop policy if exists "Teachers can view their own assignments" on public.assignments;

create policy "Teachers can view their own assignments"
on public.assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.teachers t
    where t.profile_id = auth.uid()
      and t.id = public.assignments.teacher_id
  )
);


create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
  from public.students s
  where s.profile_id = auth.uid()
  limit 1
$$;

drop policy if exists "students_can_read_own_assignments" on public.assignments;

create policy "students_can_read_own_assignments"
on public.assignments
for select
to authenticated
using (
  student_id = public.current_student_id()
);

drop policy if exists "students_can_read_own_assigned_offices" on public.offices;

create policy "students_can_read_own_assigned_offices"
on public.offices
for select
to authenticated
using (
  exists (
    select 1
    from public.assignments a
    where a.office_id = offices.id
      and a.student_id = public.current_student_id()
  )
);


create or replace function public.current_student_teacher_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct a.teacher_id
  from public.assignments a
  where a.student_id = public.current_student_id()
    and a.status in ('pending', 'active')
$$;

alter table public.teachers enable row level security;

grant select on public.teachers to authenticated;

drop policy if exists "students_can_view_assigned_teacher" on public.teachers;
drop policy if exists "students_can_read_own_teacher" on public.teachers;

create policy "students_can_view_assigned_teacher"
on public.teachers
for select
to authenticated
using (
  id in (
    select public.current_student_teacher_ids()
  )
);


<-----RLS FOR ATTENDANCE DAYS AND EVENTS------>
alter table public.attendance_days enable row level security;

drop policy if exists "students_can_view_their_own_attendance_days" on public.attendance_days;
drop policy if exists "students_can_insert_their_own_attendance_days" on public.attendance_days;
drop policy if exists "students_can_update_their_own_attendance_days" on public.attendance_days;

create policy "students_can_view_their_own_attendance_days"
on public.attendance_days
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_days.student_id
      and s.profile_id = auth.uid()
  )
);

create policy "students_can_insert_their_own_attendance_days"
on public.attendance_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_days.student_id
      and s.profile_id = auth.uid()
  )
);

create policy "students_can_update_their_own_attendance_days"
on public.attendance_days
for update
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_days.student_id
      and s.profile_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_days.student_id
      and s.profile_id = auth.uid()
  )
);


alter table public.attendance_events enable row level security;

drop policy if exists "students_can_view_their_own_attendance_events" on public.attendance_events;
drop policy if exists "students_can_insert_their_own_attendance_events" on public.attendance_events;

create policy "students_can_view_their_own_attendance_events"
on public.attendance_events
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_events.student_id
      and s.profile_id = auth.uid()
  )
);

create policy "students_can_insert_their_own_attendance_events"
on public.attendance_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.students s
    where s.id = public.attendance_events.student_id
      and s.profile_id = auth.uid()
  )
);


<-----Storage Bucket----->
create policy "Users can view their own attendance photos"
on storage.objects
for select
to authenticated
using (bucket_id = 'attendance-photos');

create policy "Students can upload attendance photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'attendance-photos');



<-----PROFILE AVATARS------>

insert into storage.buckets (id, name, public)
values ('profile-avatars', 'profile-avatars', true)
on conflict (id) do nothing;

create policy "Profile avatars are publicly readable"
on storage.objects
for select
to public
using (bucket_id = 'profile-avatars');

create policy "Users can upload their own profile avatars"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update their own profile avatars"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own profile avatars"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

<----Trying to solvee the not updated hours--->

-- 1. Change the data type to allow for partial hours (e.g., 1.5 hours)
ALTER TABLE public.students 
ALTER COLUMN completed_hours TYPE float8;

-- 2. Create the function that calculates and updates hours
CREATE OR REPLACE FUNCTION update_student_completed_hours()
RETURNS TRIGGER AS $$
DECLARE
    time_in_timestamp TIMESTAMPTZ;
    duration_hours FLOAT8;
BEGIN
    -- Only run logic if the event is a "Time Out"
    IF NEW.event_type IN ('am_out', 'pm_out') THEN
        
        -- Find the corresponding "Time In" for this student on the same day
        SELECT created_at INTO time_in_timestamp
        FROM public.attendance_days
        WHERE student_id = NEW.student_id
          AND event_type = REPLACE(NEW.event_type, '_out', '_in')
          AND created_at::date = NEW.created_at::date
        ORDER BY created_at DESC
        LIMIT 1;

        -- If we found a matching "In", calculate the difference
        IF time_in_timestamp IS NOT NULL THEN
            -- Calculate hours: (Seconds / 3600)
            duration_hours := EXTRACT(EPOCH FROM (NEW.created_at - time_in_timestamp)) / 3600;

            -- Update the students table
            UPDATE public.students
            SET completed_hours = completed_hours + duration_hours,
                updated_at = NOW()
            WHERE id = NEW.student_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger on the attendance_days table
CREATE TRIGGER trg_update_hours_on_timeout
AFTER INSERT ON public.attendance_days
FOR EACH ROW
EXECUTE FUNCTION update_student_completed_hours();



<----Event Type error----->

DROP TRIGGER IF EXISTS trg_update_hours_on_timeout ON public.attendance_days;
DROP FUNCTION IF EXISTS update_student_completed_hours();

CREATE OR REPLACE FUNCTION public.sync_student_completed_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Recompute for INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.students
    SET completed_hours = COALESCE((
      SELECT SUM(total_work_seconds) / 3600.0
      FROM public.attendance_days
      WHERE student_id = NEW.student_id
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.student_id;

    -- If student_id changed during update, also recompute old student
    IF TG_OP = 'UPDATE' AND OLD.student_id IS DISTINCT FROM NEW.student_id THEN
      UPDATE public.students
      SET completed_hours = COALESCE((
        SELECT SUM(total_work_seconds) / 3600.0
        FROM public.attendance_days
        WHERE student_id = OLD.student_id
      ), 0),
      updated_at = NOW()
      WHERE id = OLD.student_id;
    END IF;

    RETURN NEW;
  END IF;

  <-- Recompute for DELETE--->
  IF TG_OP = 'DELETE' THEN
    UPDATE public.students
    SET completed_hours = COALESCE((
      SELECT SUM(total_work_seconds) / 3600.0
      FROM public.attendance_days
      WHERE student_id = OLD.student_id
    ), 0),
    updated_at = NOW()
    WHERE id = OLD.student_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_student_completed_hours
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_days
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_completed_hours();



'
<--Fixes the updated time calculation for each students-->
update students s
set completed_hours = coalesce(t.total_seconds, 0) / 3600.0,
    updated_at = now()
from (
  select student_id, sum(total_work_seconds) as total_seconds
  from attendance_days
  group by student_id
) t
where s.id = t.student_id;

<---Reset the students who doesnt have any attendance yet (optional)--->
update students
set completed_hours = 0,
    updated_at = now()
where id not in (
  select distinct student_id
  from attendance_days
);

<---Update when there is new data--->
update students s set completed_hours = coalesce(t. total_seconds, 0) / 3600.0,
updated_at = now()
from(
  select student_id, sum (total_work_seconds) as
  total_seconds
    from attendance_days
      group by student_id
) t where s.id = t.student_id



DROP TRIGGER IF EXISTS trg_sync_student_completed_hours ON public.attendance_days;
DROP FUNCTION IF EXISTS public.sync_student_completed_hours();

CREATE OR REPLACE FUNCTION public.sync_student_completed_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- Recompute for INSERT or UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.students
    SET completed_hours = COALESCE((
      SELECT SUM(total_work_seconds) / 3600.0
      FROM public.attendance_days
      WHERE student_id = NEW.student_id
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.student_id;

    -- If student_id changed during update, also recompute old student
    IF TG_OP = 'UPDATE' AND OLD.student_id IS DISTINCT FROM NEW.student_id THEN
      UPDATE public.students
      SET completed_hours = COALESCE((
        SELECT SUM(total_work_seconds) / 3600.0
        FROM public.attendance_days
        WHERE student_id = OLD.student_id
      ), 0),
      updated_at = NOW()
      WHERE id = OLD.student_id;
    END IF;

    RETURN NEW;
  END IF;

  -- Recompute for DELETE
  IF TG_OP = 'DELETE' THEN
    UPDATE public.students
    SET completed_hours = COALESCE((
      SELECT SUM(total_work_seconds) / 3600.0
      FROM public.attendance_days
      WHERE student_id = OLD.student_id
    ), 0),
    updated_at = NOW()
    WHERE id = OLD.student_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_student_completed_hours
AFTER INSERT OR UPDATE OR DELETE ON public.attendance_days
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_completed_hours();