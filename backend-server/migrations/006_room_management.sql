-- Cho phép đổi tên hiển thị và xóa mềm phòng mà không mất lịch sử.
alter table public.rooms
  add column if not exists display_name text,
  add column if not exists archived_at timestamptz;

update public.rooms
set display_name = 'Phòng ' || id
where display_name is null or btrim(display_name) = '';

create index if not exists rooms_landlord_active_idx
  on public.rooms(landlord_id, archived_at);
