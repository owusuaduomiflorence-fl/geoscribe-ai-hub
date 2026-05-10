
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Conversations + messages
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;
create policy "conv_own_all" on public.conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "msg_own_all" on public.messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.messages(conversation_id, created_at);

-- Generated images
create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);
alter table public.generated_images enable row level security;
create policy "img_own_all" on public.generated_images for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Generated videos (we render as scene image storyboards)
create table public.generated_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  status text not null default 'completed',
  video_url text,
  poster_url text,
  scenes jsonb,
  created_at timestamptz not null default now()
);
alter table public.generated_videos enable row level security;
create policy "vid_own_all" on public.generated_videos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Journal
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  image_urls text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.journal_entries enable row level security;
create policy "journal_own_all" on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index on public.journal_entries(user_id, created_at desc);
