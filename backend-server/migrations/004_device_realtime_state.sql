-- Chạy một lần trong Supabase SQL Editor để lưu trạng thái thật của relay.
alter table public.devices
  add column if not exists relay_on boolean not null default false;

-- Cho phép Supabase Realtime phát sự kiện UPDATE của bảng devices.
do $$
begin
  alter publication supabase_realtime add table public.devices;
exception
  when duplicate_object then null;
end $$;
