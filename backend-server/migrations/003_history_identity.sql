-- Chạy file này một lần trong Supabase SQL Editor.

alter table public.control_commands
  add column if not exists issuer_name text;

alter table public.control_commands
  add column if not exists acked_at timestamptz;

alter table public.control_commands
  alter column created_at set default now();

update public.control_commands
set created_at = now()
where created_at is null;

update public.control_commands command
set issuer_name = profile.full_name
from public.profiles profile
where command.created_by = profile.id
  and command.issuer_name is null;

update public.control_commands
set issuer_name = 'Hệ thống'
where issuer_name is null;

alter table public.access_credentials
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

-- Với credential cũ chưa có chủ sở hữu, gán cho người thuê hiện tại của phòng.
update public.access_credentials credential
set user_id = room.tenant_id
from public.rooms room
where credential.room_id = room.id
  and credential.user_id is null
  and room.tenant_id is not null;

alter table public.access_events
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

alter table public.access_events
  add column if not exists user_name text;

alter table public.access_events
  alter column created_at set default now();

update public.access_events event
set user_name = profile.full_name
from public.profiles profile
where event.user_id = profile.id
  and event.user_name is null;

update public.access_events
set user_name = 'Không xác định (dữ liệu cũ)'
where user_name is null;
