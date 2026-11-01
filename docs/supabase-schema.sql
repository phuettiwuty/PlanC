-- PlanC database schema (run in Supabase SQL Editor after creating the project).
-- Authentication mapping: profiles.id references auth.users.id.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_code text unique not null,
  display_name text,
  faculty text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculums (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  total_credits integer not null check (total_credits > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curriculums(id) on delete cascade,
  code text not null,
  name_th text,
  name_en text not null,
  credits integer not null check (credits between 0 and 12),
  category text not null default 'required',
  default_term integer check (default_term between 1 and 8),
  unique (curriculum_id, code)
);

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete cascade,
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_id uuid references public.curriculums(id),
  name text not null check (char_length(trim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_courses (
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  term integer not null check (term between 1 and 8),
  primary key (plan_id, course_id)
);

create table if not exists public.study_plan_history (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  action text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cooperative_rule_groups (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curriculums(id) on delete cascade,
  name text not null,
  required_credits integer not null check (required_credits >= 0),
  minimum_gpa numeric(3,2) not null default 2.00 check (minimum_gpa between 0 and 4),
  unique (curriculum_id, name)
);

create table if not exists public.cooperative_group_courses (
  group_id uuid not null references public.cooperative_rule_groups(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (group_id, course_id)
);

alter table public.profiles enable row level security;
alter table public.study_plans enable row level security;
alter table public.study_plan_courses enable row level security;
alter table public.study_plan_history enable row level security;

create policy "students read own profile" on public.profiles for select using (auth.uid() = id);
create policy "students update own profile" on public.profiles for update using (auth.uid() = id);
create policy "students manage own plans" on public.study_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "students manage courses in own plans" on public.study_plan_courses for all using (
  exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid())
);
create policy "students read own plan history" on public.study_plan_history for select using (
  exists (select 1 from public.study_plans p where p.id = plan_id and p.user_id = auth.uid())
);
