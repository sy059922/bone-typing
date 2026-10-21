-- 뼈이름 타자연습 — 경쟁 랭킹
-- 점수는 서버가 계산한다 (score = cpm × (accuracy/100)²). 브라우저는 RPC 로만 넣을 수 있다.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  nickname text not null check (char_length(btrim(nickname)) between 1 and 12),
  mode text not null check (mode in ('ko-word', 'ko-sentence', 'en-word', 'en-sentence')),
  cpm int not null check (cpm between 0 and 1500),
  accuracy numeric(5, 2) not null check (accuracy between 0 and 100),
  items int not null check (items between 5 and 100),
  duration_ms int not null check (duration_ms between 5000 and 3600000),
  score int not null,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;
-- 직접 insert/update/delete 는 막고, 읽기는 아래 보기(leaderboard)로만
revoke all on public.scores from anon, authenticated;

-- 닉네임·모드별 최고 기록
create or replace view public.leaderboard with (security_invoker = false) as
select distinct on (mode, lower(nickname))
  nickname, mode, score, cpm, accuracy, items, duration_ms, created_at
from public.scores
order by mode, lower(nickname), score desc, created_at asc;

grant select on public.leaderboard to anon, authenticated;

create or replace function public.submit_score(
  p_nickname text, p_mode text, p_cpm int, p_accuracy numeric, p_items int, p_duration_ms int
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  -- 같은 닉네임이 1분에 5번 넘게 올리면 막음 (도배 방지)
  select count(*) into recent from scores
   where lower(nickname) = lower(btrim(p_nickname)) and created_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'too many submissions';
  end if;
  insert into scores (nickname, mode, cpm, accuracy, items, duration_ms, score)
  values (btrim(p_nickname), p_mode, p_cpm, round(p_accuracy, 2), p_items, p_duration_ms,
          round(p_cpm * power(least(greatest(p_accuracy, 0), 100) / 100.0, 2)));
end;
$$;

revoke all on function public.submit_score from public;
grant execute on function public.submit_score to anon, authenticated;
