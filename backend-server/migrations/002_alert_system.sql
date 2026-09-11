-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.alerts (
    id uuid primary key default gen_random_uuid(),
    room_id text not null references public.rooms(id) on delete cascade,
    alert_type text not null,
    status text not null default 'active',
    message text,
    measured_value double precision,
    gas_value double precision,
    threshold double precision,
    node_device_id text,
    resolved_by uuid,
    acknowledged_at timestamptz,
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.alerts add column if not exists message text;
alter table public.alerts add column if not exists measured_value double precision;
alter table public.alerts add column if not exists gas_value double precision;
alter table public.alerts add column if not exists threshold double precision;
alter table public.alerts add column if not exists node_device_id text;
alter table public.alerts add column if not exists resolved_by uuid;
alter table public.alerts add column if not exists acknowledged_at timestamptz;
alter table public.alerts add column if not exists resolved_at timestamptz;

-- Bản cũ dùng pending, trong khi ứng dụng dùng active.
update public.alerts set status = 'active' where status = 'pending';
alter table public.alerts alter column status set default 'active';

-- Gỡ CHECK cũ trên alerts.status (nếu có), rồi tạo CHECK thống nhất.
do $$
declare constraint_name text;
begin
  for constraint_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'alerts'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.alerts drop constraint %I', constraint_name);
  end loop;
end $$;

alter table public.alerts
    add constraint alerts_status_check
    check (status in ('active', 'acknowledged', 'resolved'));

create index if not exists idx_alerts_room_created
    on public.alerts(room_id, created_at desc);
create index if not exists idx_alerts_open
    on public.alerts(room_id, alert_type, status);

alter table public.alerts enable row level security;

drop policy if exists "Authenticated users can read alerts" on public.alerts;
create policy "Authenticated users can read alerts"
on public.alerts for select
to authenticated
using (true);

drop policy if exists "Authenticated users can acknowledge alerts" on public.alerts;
create policy "Authenticated users can acknowledge alerts"
on public.alerts for update
to authenticated
using (true)
with check (status in ('acknowledged', 'resolved'));

-- Bật Realtime cho cảnh báo; bỏ qua nếu bảng đã nằm trong publication.
do $$
begin
  alter publication supabase_realtime add table public.alerts;
exception
  when duplicate_object then null;
end $$;
