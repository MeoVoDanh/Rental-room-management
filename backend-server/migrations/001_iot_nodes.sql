create table if not exists public.iot_nodes (
    id uuid primary key default gen_random_uuid(),
    mac_address text not null unique,
    device_id text not null,
    node_type text not null check (node_type in ('door', 'sensor')),
    room_id text references public.rooms(id) on delete set null,
    is_online boolean not null default false,
    last_seen timestamptz,
    created_at timestamptz not null default now(),
    constraint iot_nodes_mac_format check (mac_address ~ '^[0-9A-F]{12}$')
);

create index if not exists idx_iot_nodes_room_id
on public.iot_nodes(room_id);

-- Backend dùng service-role. Không cho anon key trên mobile sửa trực tiếp bảng node.
alter table public.iot_nodes enable row level security;
