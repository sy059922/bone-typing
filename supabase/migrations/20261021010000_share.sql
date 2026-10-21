-- 공유 링크(/r/<id>)용: 점수 저장 시 id 를 돌려주고, id 로 기록 하나를 공개 조회
-- 한글 고수 타수를 고려해 상한 1500 → 2000

alter table public.scores drop constraint if exists scores_cpm_check;
alter table public.scores add constraint scores_cpm_check check (cpm between 0 and 2000);

drop function if exists public.submit_score(text, text, int, numeric, int, int);

create function public.submit_score(
  p_nickname text, p_mode text, p_cpm int, p_accuracy numeric, p_items int, p_duration_ms int
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
  new_id bigint;
begin
  select count(*) into recent from scores
   where lower(nickname) = lower(btrim(p_nickname)) and created_at > now() - interval '1 minute';
  if recent >= 5 then
    raise exception 'too many submissions';
  end if;
  insert into scores (nickname, mode, cpm, accuracy, items, duration_ms, score)
  values (btrim(p_nickname), p_mode, p_cpm, round(p_accuracy, 2), p_items, p_duration_ms,
          round(p_cpm * power(least(greatest(p_accuracy, 0), 100) / 100.0, 2)))
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.submit_score from public;
grant execute on function public.submit_score to anon, authenticated;

-- 기록 하나 + 그 점수의 현재 순위(모드별 닉네임 최고 기록 기준)
create or replace function public.get_score(p_id bigint)
returns table (nickname text, mode text, score int, cpm int, accuracy numeric, created_at timestamptz, rank bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.nickname, s.mode, s.score, s.cpm, s.accuracy, s.created_at,
         (select count(*) + 1 from leaderboard l where l.mode = s.mode and l.score > s.score) as rank
    from scores s
   where s.id = p_id;
$$;

revoke all on function public.get_score from public;
grant execute on function public.get_score to anon, authenticated;
