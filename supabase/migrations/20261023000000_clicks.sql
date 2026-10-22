-- 버튼 클릭 수 (팔로우 · 공유) — 무료 Web Analytics 는 사용자 정의 이벤트를 못 세서 여기에
create table if not exists public.clicks (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('follow', 'share_system', 'share_copy', 'share_image', 'follow_title')),
  created_at timestamptz not null default now()
);
alter table public.clicks enable row level security;
revoke all on public.clicks from anon, authenticated;

create or replace function public.log_click(p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into clicks (kind) values (p_kind);
$$;
revoke all on function public.log_click from public;
grant execute on function public.log_click to anon, authenticated;
