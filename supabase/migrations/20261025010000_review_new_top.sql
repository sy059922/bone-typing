-- 프로그램으로 '사람 속도만큼 기다렸다 제출'하는 위조는 시간만으로 못 거름 →
-- 그 모드의 현재 1위 타수를 넘는 기록(600타 이상)은 검토 중으로 숨기고 확인 뒤 올림
create or replace function public.review_threshold(p_mode text) returns int
language sql stable security definer set search_path = public as $$
  select greatest(600, coalesce((select max(cpm) from scores where mode = p_mode and status = 'ok'), 0));
$$;
revoke all on function public.review_threshold from public;

do $$
declare src text;
begin
  select pg_get_functiondef('public.submit_score(uuid, text, text, integer)'::regprocedure) into src;
  src := replace(src, $q$v_status := case when v_cpm > 800 then 'review' else 'ok' end;$q$,
                      $q$v_status := case when v_cpm > 800 or v_cpm > review_threshold(r.mode) then 'review' else 'ok' end;$q$);
  execute src;
end $$;
