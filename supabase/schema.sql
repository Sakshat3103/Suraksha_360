-- Suraksha360 — core schema
-- Run in the Supabase SQL editor for a new project.

create extension if not exists "uuid-ossp";

-- Profiles ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy "Profiles are editable by owner" on public.profiles
  for update using (auth.uid() = id);
create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

-- Auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Emergency contacts ----------------------------------------------------
create table if not exists public.emergency_contacts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  relation text not null,
  phone text not null,
  email text,
  is_primary boolean not null default false,
  notify_sms boolean not null default true,
  notify_call boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.emergency_contacts enable row level security;

create policy "Contacts are managed by owner" on public.emergency_contacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists emergency_contacts_user_id_idx on public.emergency_contacts (user_id);

-- User settings -----------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'dark',
  push_notifications boolean not null default true,
  email_notifications boolean not null default true,
  sos_gesture_enabled boolean not null default true,
  silent_mode boolean not null default false,
  anomaly_sensitivity numeric not null default 1.5,
  location_sharing boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Settings are managed by owner" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
