-- Lịch sử sự kiện thống nhất theo từng phòng.
create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id) on delete cascade,
  event_type text not null,
  source text not null default 'system',
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'Hệ thống',
  description text,
  measured_value double precision,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists room_events_room_created_idx
  on public.room_events(room_id, created_at desc);

do $$
begin
  alter publication supabase_realtime add table public.room_events;
exception
  when duplicate_object then null;
end $$;
